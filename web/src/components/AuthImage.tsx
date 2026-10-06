import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { api } from '../api/client';
export function AuthImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [url, setUrl] = useState('');
  const { data } = useQuery<Blob>({
    queryKey: ['image', src],
    queryFn: async () => (await api.get(src.replace(/^\/api/, ''), { responseType: 'blob' })).data,
    staleTime: 300000,
    retry: 0,
  });
  useEffect(() => {
    if (!data) return;
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [data]);
  return url ? (
    <img src={url} alt={alt} className={className} onClick={onClick} />
  ) : (
    <span className={clsx('image-loading', className)} aria-label={alt} />
  );
}
export function Avatar({
  user,
  size = 'normal',
}: {
  user: { fullName: string; avatarUrl?: string | null };
  size?: 'small' | 'normal' | 'large';
}) {
  return (
    <span className={clsx('avatar', `avatar-${size}`)}>
      {user.avatarUrl ? (
        <AuthImage src={user.avatarUrl} alt={user.fullName} />
      ) : (
        user.fullName
          .split(' ')
          .filter(Boolean)
          .slice(-2)
          .map((word) => word[0])
          .join('')
      )}
    </span>
  );
}
