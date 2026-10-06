import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  CheckCheck,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Paperclip,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { api, apiError } from '../../api/client';
import type { Session, Message } from '../../api/types';
import { useAuth } from '../auth/AuthProvider';
import { useMessages } from './hooks';
import { useRealtime } from './RealtimeProvider';
import { AuthImage, Avatar } from '../../components/AuthImage';
import { Button, ErrorState } from '../../components/ui';
import { Modal } from '../../components/Modal';
import { chatTime, dateLabel } from '../../lib/time';
import { vi } from '../../locales/vi';
export function ChatPanel({ session }: { session: Session }) {
  const { user } = useAuth();
  const realtime = useRealtime();
  const query = useMessages(session.id);
  const client = useQueryClient();
  const scroll = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const olderLoading = useRef(false);
  const nearBottom = useRef(true);
  const initialized = useRef(false);
  const marked = useRef(0);
  const [text, setText] = useState('');
  const [image, setImage] = useState<File>();
  const [preview, setPreview] = useState('');
  const [lightbox, setLightbox] = useState<string>();
  const [showDown, setShowDown] = useState(false);
  const closed = session.status === 'Closed';
  const messages = useMemo(
    () =>
      Array.from(
        new Map(
          (
            query.data?.pages
              .slice()
              .reverse()
              .flatMap((page) => page.items) ?? []
          ).map((message) => [message.id, message]),
        ).values(),
      ),
    [query.data],
  );
  const last = messages[messages.length - 1];
  const lastOwn = messages.filter((message) => message.senderId === user?.id).at(-1);
  useEffect(() => {
    if (!image) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    if (!messages.length || olderLoading.current) return;
    if (!initialized.current || nearBottom.current)
      requestAnimationFrame(() => {
        if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
        initialized.current = true;
      });
  }, [messages]);
  useEffect(() => {
    const unread = messages.filter((message) => message.senderId !== user?.id && !message.readAt).at(-1);
    if (!unread) return;
    let timer: ReturnType<typeof setTimeout>;
    function read() {
      if (document.visibilityState !== 'visible' || !document.hasFocus() || marked.current >= unread!.id)
        return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        marked.current = unread!.id;
        api
          .post(`/sessions/${session.id}/messages/read`)
          .then(() => {
            void client.invalidateQueries({ queryKey: ['sessions'] });
            void client.invalidateQueries({ queryKey: ['unread'] });
          })
          .catch(() => {
            marked.current = 0;
          });
      }, 300);
    }
    read();
    window.addEventListener('focus', read);
    document.addEventListener('visibilitychange', read);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', read);
      document.removeEventListener('visibilitychange', read);
    };
  }, [messages, session.id, user?.id, client]);
  const send = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      if (text.trim()) form.append('content', text.trim());
      if (image) form.append('image', image);
      return (await api.post<Message>(`/sessions/${session.id}/messages`, form)).data;
    },
    onSuccess: () => {
      setText('');
      setImage(undefined);
      nearBottom.current = true;
      void client.invalidateQueries({ queryKey: ['messages', session.id] });
      void client.invalidateQueries({ queryKey: ['sessions'] });
      input.current?.focus();
    },
    onError: (error) => toast.error(apiError(error)),
  });
  async function onScroll() {
    const element = scroll.current;
    if (!element) return;
    nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 150;
    setShowDown(!nearBottom.current);
    if (element.scrollTop < 35 && query.hasNextPage && !query.isFetchingNextPage && !olderLoading.current) {
      olderLoading.current = true;
      const before = element.scrollHeight,
        top = element.scrollTop;
      await query.fetchNextPage();
      requestAnimationFrame(() => {
        if (scroll.current) scroll.current.scrollTop = top + scroll.current.scrollHeight - before;
        olderLoading.current = false;
      });
    }
  }
  function choose(file?: File) {
    if (!file) return;
    if (file.size > 5242880 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(vi.chat.imageHint);
      return;
    }
    setImage(file);
  }
  function submit() {
    if (!send.isPending && !closed && (text.trim() || image)) send.mutate();
  }
  return (
    <section className="chat-panel panel">
      <header className="chat-header">
        <Avatar user={session.counterpart} />
        <div>
          <strong>{session.counterpart.fullName}</strong>
          <span className={realtime === 'connected' ? 'connection-connected' : ''}>
            <i />
            {realtime === 'connected'
              ? vi.chat.connected
              : realtime === 'reconnecting'
                ? vi.chat.reconnecting
                : vi.chat.disconnected}
          </span>
        </div>
        <span className="chat-header-icon">
          <ShieldCheck size={21} />
        </span>
      </header>
      {closed && (
        <div className="closed-banner">
          <LockKeyhole size={15} />
          {vi.chat.closed}
        </div>
      )}
      <div
        className="chat-scroll"
        ref={scroll}
        onScroll={() => void onScroll()}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={vi.chat.history}
      >
        {query.isPending ? (
          <div className="chat-loading">
            <LoaderCircle className="spin" size={24} />
            {vi.common.loading}
          </div>
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <ImagePlus size={38} />
            <h3>{vi.chat.emptyTitle}</h3>
            <p>{vi.chat.emptyBody}</p>
          </div>
        ) : (
          <>
            {query.isFetchingNextPage && <div className="older-loading">{vi.chat.loadingOlder}</div>}
            {messages.map((message, i) => {
              const own = message.senderId === user?.id;
              const newDay =
                !messages[i - 1] || dateLabel(messages[i - 1].sentAt) !== dateLabel(message.sentAt);
              return (
                <Fragment key={message.id}>
                  {newDay && (
                    <div className="message-date">
                      <span>{dateLabel(message.sentAt)}</span>
                    </div>
                  )}
                  <div className={clsx('message-row', own && 'own')}>
                    {!own && (
                      <Avatar
                        user={{ fullName: message.senderName, avatarUrl: message.senderAvatarUrl }}
                        size="small"
                      />
                    )}
                    <div className="message-block">
                      <div className="message-bubble">
                        {message.imageUrl && (
                          <button
                            className="chat-image-button"
                            aria-label={vi.chat.viewImage}
                            onClick={() => setLightbox(message.imageUrl!)}
                          >
                            <AuthImage
                              src={message.imageUrl}
                              alt={vi.chat.attachedImage}
                              className="message-image"
                            />
                          </button>
                        )}
                        {message.content && <p>{message.content}</p>}
                        <time>{chatTime(message.sentAt)}</time>
                      </div>
                      {own && message.id === lastOwn?.id && (
                        <span className="message-receipt">
                          <CheckCheck size={12} />
                          {message.readAt ? `${vi.chat.seen} · ${chatTime(message.readAt)}` : vi.chat.sent}
                        </span>
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </>
        )}
      </div>
      {showDown && (
        <button
          className="scroll-down icon-button"
          onClick={() => {
            scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' });
            nearBottom.current = true;
          }}
          aria-label={vi.chat.scrollBottom}
        >
          <ArrowDown size={18} />
        </button>
      )}
      {preview && (
        <div className="attachment-preview">
          <img src={preview} alt={vi.chat.photoPreview} />
          <div>
            <strong>{image?.name}</strong>
            <span>{vi.chat.previewHint}</span>
          </div>
          <button
            className="icon-button"
            onClick={() => setImage(undefined)}
            aria-label={vi.chat.removeImage}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <button
          type="button"
          className="icon-button attach-button"
          disabled={closed || send.isPending}
          aria-label={vi.chat.attachImage}
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip size={20} />
        </button>
        <input
          type="file"
          className="sr-only"
          ref={fileInput}
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <textarea
          ref={input}
          aria-label={vi.chat.messageLabel}
          placeholder={closed ? vi.chat.closedPlaceholder : vi.chat.messageHint}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2000}
          rows={1}
          disabled={closed}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <Button
          type="submit"
          loading={send.isPending}
          disabled={closed || (!text.trim() && !image)}
          aria-label={vi.common.send}
          className="send-button"
        >
          <Send size={19} />
        </Button>
      </form>
      <div className="chat-safety">
        <ShieldCheck size={13} />
        <p>{vi.chat.safety}</p>
      </div>
      <Modal open={Boolean(lightbox)} title={vi.chat.photoPreview} onClose={() => setLightbox(undefined)}>
        {lightbox && <AuthImage src={lightbox} alt={vi.chat.attachedImage} className="lightbox-image" />}
      </Modal>
      <span className="sr-only">{last ? chatTime(last.sentAt) : ''}</span>
    </section>
  );
}
