import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { api, applyFormError } from '../../api/client';
import { Button, ErrorState } from '../../components/ui';
import { Field, FormError } from '../../components/forms';
import { vi } from '../../locales/vi';
import { fullTime } from '../../lib/time';
interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: string;
}
const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500, vi.review.commentInvalid),
});
export function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating}/5 ${vi.review.stars}`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} size={16} fill={value <= rating ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}
export function ReviewPanel({ sessionId, canReview }: { sessionId: string; canReview: boolean }) {
  const query = useQuery<Review | null>({
    queryKey: ['review', sessionId],
    queryFn: async () => (await api.get(`/sessions/${sessionId}/review`)).data,
  });
  const client = useQueryClient();
  const [hover, setHover] = useState(0);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 5, comment: '' },
  });
  const rating = form.watch('rating');
  async function submit(input: z.infer<typeof schema>) {
    try {
      await api.post(`/sessions/${sessionId}/review`, input);
      void client.invalidateQueries({ queryKey: ['review', sessionId] });
      void client.invalidateQueries({ queryKey: ['public-user'] });
      toast.success(vi.review.success);
    } catch (error) {
      applyFormError(error, form.setError);
    }
  }
  return (
    <section className="panel review-panel">
      <div className="review-heading">
        <Heart size={22} />
        <h3>{vi.review.title}</h3>
      </div>
      {query.isPending ? (
        <p className="field-hint">{vi.common.loading}</p>
      ) : query.isError ? (
        <ErrorState retry={() => void query.refetch()} />
      ) : query.data ? (
        <div className="review-result">
          <Stars rating={query.data.rating} />
          <p>{query.data.comment ?? vi.review.noComment}</p>
          <small>
            {query.data.reviewerName} · {fullTime(query.data.createdAt)}
          </small>
        </div>
      ) : canReview ? (
        <form onSubmit={form.handleSubmit(submit)}>
          <p>{vi.review.body}</p>
          <fieldset className="rating-field">
            <legend className="sr-only">{vi.review.rating}</legend>
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} onMouseEnter={() => setHover(value)} onMouseLeave={() => setHover(0)}>
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => form.setValue('rating', value)}
                  aria-label={`${value} ${vi.review.stars}`}
                />
                <Star size={27} fill={value <= (hover || rating) ? 'currentColor' : 'none'} />
              </label>
            ))}
          </fieldset>
          <Field
            htmlFor="review-comment"
            label={vi.review.comment}
            error={form.formState.errors.comment?.message}
          >
            <textarea
              id="review-comment"
              rows={3}
              maxLength={500}
              placeholder={vi.review.commentHint}
              {...form.register('comment')}
            />
          </Field>
          <FormError message={form.formState.errors.root?.message} />
          <Button type="submit" loading={form.formState.isSubmitting} className="w-full">
            {vi.review.send}
          </Button>
        </form>
      ) : (
        <p className="review-wait">{vi.review.waiting}</p>
      )}
    </section>
  );
}
