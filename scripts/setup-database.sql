-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (linked to Stacks wallet addresses)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stacks_address TEXT UNIQUE NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POAPs table
CREATE TABLE IF NOT EXISTS poaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_id INTEGER UNIQUE NOT NULL,
  owner_address TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  minted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  FOREIGN KEY (owner_address) REFERENCES users(stacks_address) ON DELETE CASCADE
);

-- Posts table (POAP-gated)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_address TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes_count INTEGER DEFAULT 0,
  FOREIGN KEY (author_address) REFERENCES users(stacks_address) ON DELETE CASCADE
);

-- Voting proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of option strings
  vote_counts JSONB DEFAULT '{}', -- Object mapping option index to vote count
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (creator_address) REFERENCES users(stacks_address) ON DELETE CASCADE
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL,
  voter_address TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_address) REFERENCES users(stacks_address) ON DELETE CASCADE,
  UNIQUE(proposal_id, voter_address) -- One vote per user per proposal
);

-- User milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_address TEXT NOT NULL,
  milestone_type TEXT NOT NULL, -- 'posts_created', 'votes_cast', 'poaps_minted'
  milestone_name TEXT NOT NULL, -- 'First Post', '10 Votes Cast', etc.
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  FOREIGN KEY (user_address) REFERENCES users(stacks_address) ON DELETE CASCADE
);

-- User stats table (for milestone tracking)
CREATE TABLE IF NOT EXISTS user_stats (
  user_address TEXT PRIMARY KEY,
  posts_created INTEGER DEFAULT 0,
  votes_cast INTEGER DEFAULT 0,
  poaps_owned INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_address) REFERENCES users(stacks_address) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_poaps_owner ON poaps(owner_address);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_address);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_address);
CREATE INDEX IF NOT EXISTS idx_milestones_user ON milestones(user_address);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE poaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read, authenticated write
CREATE POLICY "Public can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert themselves" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update themselves" ON users FOR UPDATE USING (true);

CREATE POLICY "Public can view POAPs" ON poaps FOR SELECT USING (true);
CREATE POLICY "Anyone can insert POAPs" ON poaps FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Anyone can create posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Authors can update their posts" ON posts FOR UPDATE USING (true);

CREATE POLICY "Public can view proposals" ON proposals FOR SELECT USING (true);
CREATE POLICY "Anyone can create proposals" ON proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Creators can update their proposals" ON proposals FOR UPDATE USING (true);

CREATE POLICY "Public can view votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Anyone can cast votes" ON votes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view milestones" ON milestones FOR SELECT USING (true);
CREATE POLICY "Anyone can insert milestones" ON milestones FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view user stats" ON user_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can update user stats" ON user_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user stats" ON user_stats FOR UPDATE USING (true);

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_address, posts_created, votes_cast, poaps_owned, updated_at)
  VALUES (NEW.author_address, 1, 0, 0, NOW())
  ON CONFLICT (user_address) 
  DO UPDATE SET 
    posts_created = CASE WHEN TG_TABLE_NAME = 'posts' THEN user_stats.posts_created + 1 ELSE user_stats.posts_created END,
    votes_cast = CASE WHEN TG_TABLE_NAME = 'votes' THEN user_stats.votes_cast + 1 ELSE user_stats.votes_cast END,
    poaps_owned = CASE WHEN TG_TABLE_NAME = 'poaps' THEN user_stats.poaps_owned + 1 ELSE user_stats.poaps_owned END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating stats
CREATE TRIGGER update_stats_on_post
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER update_stats_on_vote
AFTER INSERT ON votes
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();
