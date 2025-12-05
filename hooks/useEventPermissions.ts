import { useAuth } from '../context/AuthContext';
import { Event, EventStatus, UserRole } from '../types';

export const useEventPermissions = (event: Event | null) => {
  const { user } = useAuth();

  if (!user || !event) {
    return {
      canApprove: false,
      canReject: false,
      canEdit: false,
      canDelete: false,
    };
  }

  const isCreator = event.createdById === user.id;
  const isAdmin = user.role === UserRole.ADMIN;
  const isSupervisor = user.role === UserRole.SUPERVISOR;

  // Approve/Reject: Only Admin or Supervisor, and only if Pending
  const canApprove = (isAdmin || isSupervisor) && event.status === EventStatus.PENDING;
  const canReject = (isAdmin || isSupervisor) && event.status === EventStatus.PENDING;

  // Edit: 
  // - Admin/Supervisor can edit almost anything (usually), or restrictive: only if not approved? 
  //   Let's assume Admin/Supervisor can edit regardless, but Creator only if Pending.
  //   Based on backend: Coordinator cannot edit if processed. Supervisor/Admin can edit.
  const canEdit = isAdmin || isSupervisor || (isCreator && event.status === EventStatus.PENDING);

  // Delete:
  // - Admin: Always
  // - Supervisor: If NOT Approved
  // - Creator: If Pending
  const canDelete = 
    isAdmin || 
    (isSupervisor && event.status !== EventStatus.APPROVED) || 
    (isCreator && event.status === EventStatus.PENDING);

  return { canApprove, canReject, canEdit, canDelete };
};