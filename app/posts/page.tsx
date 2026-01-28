'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { checkPOAPOwnership } from '@/lib/stacks';
import { MessageSquare, Plus, Wallet, CheckCircle2, XCircle, Heart, MessageCircle } from 'lucide-react';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

interface Post {
  id: string;
  user_address: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

export default function PostsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [hasPOAP, setHasPOAP] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
  });

  const supabase = createClient();

  useEffect(() => {
    loadPosts();
    
    // Subscribe to new posts
    const channel = supabase
      .channel('posts_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'posts' 
      }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isConnected && userAddress) {
      checkPOAPStatus();
    }
  }, [isConnected, userAddress]);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'POAP Platform',
        icon: '/icon.png',
      },
      redirectTo: '/',
      onFinish: () => {
        const userData = userSession.loadUserData();
        setIsConnected(true);
        setUserAddress(userData.profile.stxAddress.testnet);
      },
      userSession,
    });
  };

  const checkPOAPStatus = async () => {
    const owns = await checkPOAPOwnership(userAddress);
    setHasPOAP(owns);
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setPosts(data);
    }
  };

  const handleCreatePost = async () => {
    if (!hasPOAP) {
      alert('You need a POAP to create posts');
      return;
    }

    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('posts').insert({
        user_address: userAddress,
        title: newPost.title,
        content: newPost.content,
      });

      if (error) throw error;

      // Update user stats
      await supabase.rpc('increment_posts_created', { user_addr: userAddress });

      setShowCreateDialog(false);
      setNewPost({ title: '', content: '' });
      loadPosts();
    } catch (err) {
      console.error('[v0] Error creating post:', err);
      alert('Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!isConnected) {
      alert('Connect your wallet to like posts');
      return;
    }

    try {
      const { error } = await supabase.from('likes').insert({
        post_id: postId,
        user_address: userAddress,
      });

      if (!error) {
        loadPosts();
      }
    } catch (err) {
      console.error('[v0] Error liking post:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Badge variant="outline" className="mb-3">
                Community
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Community Posts
              </h1>
              <p className="text-muted-foreground text-lg">
                Share your thoughts with the community
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!isConnected ? (
                <Button onClick={connectWallet} size="lg">
                  <Wallet className="mr-2 h-5 w-5" />
                  Connect Wallet
                </Button>
              ) : (
                <>
                  <Badge variant={hasPOAP ? 'default' : 'secondary'} className="px-4 py-2">
                    {hasPOAP ? (
                      <>
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        POAP Holder
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-4 w-4" />
                        No POAP
                      </>
                    )}
                  </Badge>
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button size="lg" disabled={!hasPOAP}>
                        <Plus className="mr-2 h-5 w-5" />
                        Create Post
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create New Post</DialogTitle>
                        <DialogDescription>
                          Share your thoughts with the community
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="post-title">Title</Label>
                          <Input
                            id="post-title"
                            value={newPost.title}
                            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                            placeholder="Give your post a title..."
                            maxLength={200}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="post-content">Content</Label>
                          <Textarea
                            id="post-content"
                            value={newPost.content}
                            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                            placeholder="What's on your mind?"
                            rows={8}
                          />
                        </div>
                        <Button onClick={handleCreatePost} disabled={isLoading} className="w-full">
                          {isLoading ? 'Posting...' : 'Publish Post'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>

          {!hasPOAP && isConnected && (
            <Alert className="mb-6">
              <AlertDescription>
                You need to own a POAP to create posts. Visit the mint page to get one.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {posts.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Be the first to share something with the community
                  </p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {post.user_address.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl mb-1">{post.title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">
                            {post.user_address.slice(0, 6)}...{post.user_address.slice(-4)}
                          </span>
                          <span>•</span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  </CardContent>
                  <CardFooter className="flex items-center gap-4 border-t pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className="gap-2"
                    >
                      <Heart className="h-4 w-4" />
                      {post.likes_count > 0 && <span>{post.likes_count}</span>}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {post.comments_count > 0 && <span>{post.comments_count}</span>}
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
