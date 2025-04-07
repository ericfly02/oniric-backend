export interface Dream {
  id?: string;
  user_id: string;
  title: string;
  description: string;
  date: string;
  mood?: string;
  mood_score?: number;
  symbols?: string[];
  ai_analysis?: string;
  image_url?: string;
  video_url?: string;
  duration?: number;
  quality?: string;
  created_at: string;
  updated_at: string;
  video_task_id?: string;
  video_status?: 'completed' | 'failed' | 'processing';
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  price: number;
  status: string;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  tier: string;
  is_premium: boolean;
}

export interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
} 