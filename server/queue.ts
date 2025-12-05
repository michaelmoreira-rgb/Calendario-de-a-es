import Queue from 'bull';
import { sendEmail } from './services/email';

// Initialize Bull Queue
// If REDIS_URL is not provided, it defaults to localhost:6379
export const emailQueue = new Queue('email', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Process Jobs
emailQueue.process(async (job) => {
  const { to, subject, template, context } = job.data;
  
  console.log(`Processing email job ${job.id} for ${to}`);
  
  try {
    await sendEmail(to, subject, template, context);
    console.log(`Job ${job.id} completed`);
  } catch (error) {
    console.error(`Job ${job.id} failed`, error);
    throw error; // Bull will retry if configured
  }
});

// Helper to add jobs
export const addEmailJob = (
  to: string,
  subject: string,
  template: string,
  context: any
) => {
  // Add to queue with retry options
  return emailQueue.add(
    { to, subject, template, context },
    { 
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  );
};

// Handle Queue Events for logging
emailQueue.on('error', (error) => {
  console.error('Queue Error:', error);
});

emailQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});