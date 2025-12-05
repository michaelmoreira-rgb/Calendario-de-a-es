import { google } from 'googleapis';
import { EventType } from '../../types';

// Initialize auth using Service Account credentials from environment variables
// Handles both standard string and escaped newline characters in private keys
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

/**
 * Maps application EventType to Google Calendar Color IDs.
 * Mappings based on seed data requirements.
 */
const getColorId = (type: EventType): string => {
  switch (type) {
    case EventType.EVENTO: return '8';       // Graphite (#757575)
    case EventType.ACAO_PONTUAL: return '5'; // Banana (#F6BF26)
    case EventType.REUNIAO: return '9';      // Blueberry (#3F51B5)
    case EventType.VISITA: return '10';      // Basil (#0B8043)
    case EventType.FERIAS: return '11';      // Tomato (#D50000)
    case EventType.FOLGA: return '3';        // Grape (#8E24AA)
    case EventType.LICENCA: return '4';      // Flamingo (#E67C73)
    case EventType.OUTROS: return '8';       // Graphite (#616161)
    default: return '8';
  }
};

/**
 * Generic retry wrapper for API calls.
 * Implements exponential backoff.
 */
const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 500): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0) {
      // Don't retry on 400 (Bad Request) or 401 (Unauthorized) usually, but retry on 429/5xx
      const status = error.code || error.response?.status;
      if (status === 429 || (status >= 500 && status < 600)) {
        await new Promise(res => setTimeout(res, delay));
        return withRetry(operation, retries - 1, delay * 2);
      }
    }
    throw error;
  }
};

export const createGoogleCalendarEvent = async (event: any): Promise<string> => {
  return withRetry(async () => {
    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: event.title,
        description: event.description || '',
        start: event.isAllDay 
          ? { date: event.startDate.toISOString().split('T')[0] } 
          : { dateTime: event.startDate.toISOString() },
        end: event.isAllDay 
          ? { date: event.endDate.toISOString().split('T')[0] } 
          : { dateTime: event.endDate.toISOString() },
        colorId: getColorId(event.eventType),
      },
    });
    
    if (!res.data.id) {
      throw new Error('Google Calendar API did not return an event ID');
    }
    
    return res.data.id;
  });
};

export const updateGoogleCalendarEvent = async (googleEventId: string, event: any): Promise<void> => {
  await withRetry(async () => {
    await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
      requestBody: {
        summary: event.title,
        description: event.description || '',
        start: event.isAllDay 
          ? { date: event.startDate.toISOString().split('T')[0] } 
          : { dateTime: event.startDate.toISOString() },
        end: event.isAllDay 
          ? { date: event.endDate.toISOString().split('T')[0] } 
          : { dateTime: event.endDate.toISOString() },
        colorId: getColorId(event.eventType),
      },
    });
  });
};

export const deleteGoogleCalendarEvent = async (googleEventId: string): Promise<void> => {
  await withRetry(async () => {
    try {
      await calendar.events.delete({
        calendarId: CALENDAR_ID,
        eventId: googleEventId,
      });
    } catch (error: any) {
      // If event is already deleted (410) or not found (404), consider it a success
      if (error.code === 404 || error.code === 410 || error.response?.status === 404 || error.response?.status === 410) {
        return;
      }
      throw error;
    }
  });
};

/**
 * Checks if there are any events in the calendar overlapping with the given time range.
 * Returns true if busy, false if free.
 */
export const checkCalendarBusy = async (start: Date, end: Date): Promise<boolean> => {
  try {
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: CALENDAR_ID }],
      },
    });

    const busy = res.data.calendars?.[CALENDAR_ID]?.busy;
    return !!(busy && busy.length > 0);
  } catch (error) {
    console.error('Failed to check calendar availability:', error);
    return false; // Fail open (allow event if check fails)
  }
};