import { useEffect, useState } from 'react';
import { api, type PostItem } from '../utils/api';
import { useI18n } from '../i18n';
import PostComposer from './PostComposer';
import PostCard from './PostCard';
import FriendsSidebar from './FriendsSidebar';

// Лента: вкладки «Все / Друзья», поле для нового поста и список постов.
export default function FeedPage({
  me,
  onOpenProfile,
  onOpenFriends,
}: {
  me: { avatar: string; color: string; letter: string };
  onOpenProfile?: (id: number) => void;
  onOpenFriends?: () => void;
}) {
  const { t } = useI18n();
  const [scope, setScope] = useState<'all' | 'friends'>('all');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .feed(scope)
      .then((p) => {
        if (alive) {
          setPosts(p);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setPosts([]);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [scope]);

  return (
    <div className="page-scroll">
      <div className="social-layout">
        <div className="social-main">
          <div className="feed-page">
            <div className="feed-tabs">
              <button
                type="button"
                className={`feed-tab${scope === 'all' ? ' feed-tab--active' : ''}`}
                onClick={() => setScope('all')}
              >
                {t('feed.tabAll')}
              </button>
              <button
                type="button"
                className={`feed-tab${scope === 'friends' ? ' feed-tab--active' : ''}`}
                onClick={() => setScope('friends')}
              >
                {t('feed.tabFriends')}
              </button>
            </div>

            <PostComposer me={me} onPosted={(p) => setPosts((prev) => [p, ...prev])} />

            {loading ? (
              <div className="feed-empty">{t('common.loading')}</div>
            ) : posts.length === 0 ? (
              <div className="feed-empty">{t(scope === 'friends' ? 'feed.emptyFriends' : 'feed.empty')}</div>
            ) : (
              <div className="feed-list">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onOpenProfile={onOpenProfile}
                    onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <FriendsSidebar onOpenProfile={onOpenProfile} onOpenFriends={onOpenFriends} />
      </div>
    </div>
  );
}
