import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HandHeart, Play, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiError } from '../../api/client';
import type { SupportRequest, User } from '../../api/types';
import { Button } from '../../components/ui';
import { ConfirmModal } from '../../components/Modal';
import { vi } from '../../locales/vi';
export function allowedAction(request: SupportRequest, user: Pick<User, 'role' | 'id'> | null) {
  if (!user || request.isHidden) return null;
  if (user.role === 'Helper' && request.status === 'Open') return 'accept';
  if (user.role === 'Helper' && request.helper?.id === user.id && request.status === 'Accepted')
    return 'start';
  if (user.role === 'Requester' && request.requester.id === user.id && request.status === 'InProgress')
    return 'complete';
  return null;
}
export function RequestActions({ request, user }: { request: SupportRequest; user: User | null }) {
  const action = allowedAction(request, user);
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/requests/${request.id}/${action}`)).data as { sessionId?: string },
    onSuccess: (data) => {
      toast.success(
        action === 'accept'
          ? vi.requests.acceptSuccess
          : action === 'start'
            ? vi.requests.startSuccess
            : vi.requests.completeSuccess,
      );
      setConfirm(false);
      void client.invalidateQueries({ queryKey: ['requests'] });
      void client.invalidateQueries({ queryKey: ['request', request.id] });
      void client.invalidateQueries({ queryKey: ['history', request.id] });
      void client.invalidateQueries({ queryKey: ['sessions'] });
      void client.invalidateQueries({ queryKey: ['session'] });
      if (action === 'accept' && data.sessionId) navigate(`/sessions/${data.sessionId}`);
    },
    onError: (error) => {
      toast.error(apiError(error));
      setConfirm(false);
      void client.invalidateQueries({ queryKey: ['requests'] });
      void client.invalidateQueries({ queryKey: ['request', request.id] });
      void client.invalidateQueries({ queryKey: ['session'] });
    },
  });
  if (!action)
    return (
      <div className="panel action-card">
        <CheckCheck size={28} />
        <p>
          {request.status === 'Completed'
            ? vi.requests.completedNote
            : request.status === 'Accepted'
              ? vi.requests.statusWait
              : request.status === 'InProgress'
                ? vi.requests.completionWait
                : vi.requests.actionHint}
        </p>
      </div>
    );
  const label =
    action === 'accept' ? vi.requests.accept : action === 'start' ? vi.requests.start : vi.requests.complete;
  return (
    <div className="panel action-card">
      <HandHeart size={31} />
      <p>{vi.requests.actionHint}</p>
      <Button
        className="w-full"
        loading={mutation.isPending}
        onClick={() => (action === 'start' ? mutation.mutate() : setConfirm(true))}
      >
        {action === 'start' ? <Play size={16} /> : <HandHeart size={17} />}
        {label}
      </Button>
      <ConfirmModal
        open={confirm}
        title={action === 'accept' ? vi.requests.acceptTitle : vi.requests.completeTitle}
        body={action === 'accept' ? vi.requests.acceptBody : vi.requests.completeBody}
        confirmLabel={label}
        onClose={() => setConfirm(false)}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </div>
  );
}
