import { useState } from 'react';
import { api, type PostItem, type PostComment, type ChatUser } from '../utils/api';
import { useI18n } from '../i18n';
import { timeAgo } from '../utils/time';

function avStyle(u: ChatUser | null) {
  if (u?.avatar) return { backgroundImage: `url(${u.avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return { background: u?.color || '#888' };
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.8 5.6 5 5c2-.4 3.7.7 4.6 2.1L12 10l2.4-2.9C15.3 5.7 17 4.6 19 5c3.2.6 4.4 4 3 6.8C19.5 16.4 12 21 12 21Z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

// Карточка поста: автор, текст, картинка, лайк и комментарии.
export default function PostCard({
  post,
  onOpenProfile,
  onDeleted,
}: {
  post: PostItem;
  onOpenProfile?: (id: number) => void;
  onDeleted?: (id: number) => void;
}) {
  const { t, locale } = useI18n();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [cInput, setCInput] = useState('');
  const [cBusy, setCBusy] = useState(false);
  const a = post.author;

  async function toggleLike() {
    const wasLiked = liked;
    const wasCount = likeCount;
    setLiked(!wasLiked); // оптимистично
    setLikeCount(wasCount + (wasLiked ? -1 : 1));
    try {
      const r = await api.likePost(post.id);
      setLiked(r.liked);
      setLikeCount(r.likeCount);
    } catch {
      setLiked(wasLiked);
      setLikeCount(wasCount);
    }
  }

  async function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const list = await api.postComments(post.id);
        setComments(list);
        setCommentCount(list.length);
      } catch {
        /* ignore */
      }
    }
  }

  async function sendComment() {
    const text = cInput.trim();
    if (!text || cBusy) return;
    setCBusy(true);
    try {
      const c = await api.addComment(post.id, text);
      setComments((p) => [...p, c]);
      setCommentCount((n) => n + 1);
      setCInput('');
    } catch {
      /* ignore */
    } finally {
      setCBusy(false);
    }
  }

  async function delComment(id: number) {
    if (!window.confirm(t('post.deleteCommentConfirm'))) return;
    try {
      await api.deleteComment(id);
      setComments((p) => p.filter((x) => x.id !== id));
      setCommentCount((n) => Math.max(0, n - 1));
    } catch {
      /* ignore */
    }
  }

  async function deletePost() {
    if (!window.confirm(t('post.deleteConfirm'))) return;
    try {
      await api.deletePost(post.id);
      onDeleted?.(post.id);
    } catch {
      /* ignore */
    }
  }

  return (
    <article className="post">
      <header className="post-head">
        <button
          type="button"
          className="post-av"
          style={avStyle(a)}
          onClick={() => a && onOpenProfile?.(a.id)}
          aria-label={a?.name}
        >
          {a?.avatar ? '' : a?.letter}
        </button>
        <button type="button" className="post-id" onClick={() => a && onOpenProfile?.(a.id)}>
          <span className="post-name">{a?.name || '—'}</span>
          <span className="post-when">{timeAgo(post.createdAt, locale)}</span>
        </button>
        {post.mine && (
          <button type="button" className="post-del" onClick={deletePost} aria-label={t('post.delete')} title={t('post.delete')}>
            🗑
          </button>
        )}
      </header>

      {post.text && <div className="post-text">{post.text}</div>}
      {post.image && (
        <div className="post-image">
          <img src={post.image} alt="" />
        </div>
      )}

      <div className="post-actions">
        <button type="button" className={`post-action${liked ? ' post-action--liked' : ''}`} onClick={toggleLike}>
          <HeartIcon filled={liked} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button type="button" className={`post-action${open ? ' post-action--on' : ''}`} onClick={toggleComments}>
          <CommentIcon />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
      </div>

      {open && (
        <div className="post-comments">
          {comments.length === 0 ? (
            <div className="post-no-comments">{t('post.noComments')}</div>
          ) : (
            comments.map((c) => (
              <div className="post-comment" key={c.id}>
                <button
                  type="button"
                  className="post-comment-av"
                  style={avStyle(c.author)}
                  onClick={() => c.author && onOpenProfile?.(c.author.id)}
                  aria-label={c.author?.name}
                >
                  {c.author?.avatar ? '' : c.author?.letter}
                </button>
                <div className="post-comment-body">
                  <button
                    type="button"
                    className="post-comment-name"
                    onClick={() => c.author && onOpenProfile?.(c.author.id)}
                  >
                    {c.author?.name || '—'}
                  </button>
                  <span className="post-comment-text">{c.text}</span>
                  <span className="post-comment-when">{timeAgo(c.createdAt, locale)}</span>
                </div>
                {c.mine && (
                  <button
                    type="button"
                    className="post-comment-del"
                    onClick={() => delComment(c.id)}
                    aria-label={t('post.delete')}
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}

          <div className="post-comment-input">
            <input
              value={cInput}
              onChange={(e) => setCInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendComment()}
              placeholder={t('post.commentPh')}
              maxLength={2000}
            />
            <button type="button" onClick={sendComment} disabled={cBusy || !cInput.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
