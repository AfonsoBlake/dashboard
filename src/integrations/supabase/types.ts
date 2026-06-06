export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string | null
          gym_id: string
          id: string
          location: string | null
          name: string | null
          phone: string | null
          preferred_day: string | null
          preferred_time: string | null
          source: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gym_id: string
          id?: string
          location?: string | null
          name?: string | null
          phone?: string | null
          preferred_day?: string | null
          preferred_time?: string | null
          source?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gym_id?: string
          id?: string
          location?: string | null
          name?: string | null
          phone?: string | null
          preferred_day?: string | null
          preferred_time?: string | null
          source?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ai_paused: boolean
          ai_paused_at: string | null
          ai_score: string | null
          ai_score_reason: string | null
          conversation_tag: string | null
          created_at: string | null
          escalated_at: string | null
          escalation_reason: string | null
          gym_id: string
          id: string
          last_message_at: string | null
          last_staff_reply_at: string | null
          lead_status: string | null
          messages: Json | null
          resolved_at: string | null
          status: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          ai_paused?: boolean
          ai_paused_at?: string | null
          ai_score?: string | null
          ai_score_reason?: string | null
          conversation_tag?: string | null
          created_at?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          gym_id: string
          id?: string
          last_message_at?: string | null
          last_staff_reply_at?: string | null
          lead_status?: string | null
          messages?: Json | null
          resolved_at?: string | null
          status?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          ai_paused?: boolean
          ai_paused_at?: string | null
          ai_score?: string | null
          ai_score_reason?: string | null
          conversation_tag?: string | null
          created_at?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          gym_id?: string
          id?: string
          last_message_at?: string | null
          last_staff_reply_at?: string | null
          lead_status?: string | null
          messages?: Json | null
          resolved_at?: string | null
          status?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_summaries: {
        Row: {
          gym_id: string
          id: string
          last_updated: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          gym_id: string
          id?: string
          last_updated?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          gym_id?: string
          id?: string
          last_updated?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      escalated_questions: {
        Row: {
          contact_id: string
          contact_name: string | null
          created_at: string | null
          gym_id: string
          id: string
          message: string
          platform: string | null
          resolved: boolean | null
          resolved_at: string | null
        }
        Insert: {
          contact_id: string
          contact_name?: string | null
          created_at?: string | null
          gym_id: string
          id?: string
          message: string
          platform?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
        }
        Update: {
          contact_id?: string
          contact_name?: string | null
          created_at?: string | null
          gym_id?: string
          id?: string
          message?: string
          platform?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalated_questions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          created_at: string | null
          follow_up_message: string | null
          follow_up_type: string | null
          gym_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          follow_up_message?: string | null
          follow_up_type?: string | null
          gym_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          follow_up_message?: string | null
          follow_up_type?: string | null
          gym_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gym_configs: {
        Row: {
          bio: string | null
          closing_time: string | null
          created_at: string | null
          email: string | null
          escalation_contact: string | null
          escalation_enabled: boolean | null
          gym_name: string
          id: string
          logo_url: string | null
          manager_name: string | null
          manychat_api_key: string | null
          model: string | null
          opening_time: string | null
          phone: string | null
          photo_map: Json | null
          quick_replies: Json | null
          system_prompt: string
        }
        Insert: {
          bio?: string | null
          closing_time?: string | null
          created_at?: string | null
          email?: string | null
          escalation_contact?: string | null
          escalation_enabled?: boolean | null
          gym_name: string
          id: string
          logo_url?: string | null
          manager_name?: string | null
          manychat_api_key?: string | null
          model?: string | null
          opening_time?: string | null
          phone?: string | null
          photo_map?: Json | null
          quick_replies?: Json | null
          system_prompt: string
        }
        Update: {
          bio?: string | null
          closing_time?: string | null
          created_at?: string | null
          email?: string | null
          escalation_contact?: string | null
          escalation_enabled?: boolean | null
          gym_name?: string
          id?: string
          logo_url?: string | null
          manager_name?: string | null
          manychat_api_key?: string | null
          model?: string | null
          opening_time?: string | null
          phone?: string | null
          photo_map?: Json | null
          quick_replies?: Json | null
          system_prompt?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          ai_reply: string | null
          contact_id: string
          contact_name: string | null
          created_at: string | null
          gym_id: string
          id: string
          message: string
          platform: string | null
          status: string
        }
        Insert: {
          ai_reply?: string | null
          contact_id: string
          contact_name?: string | null
          created_at?: string | null
          gym_id: string
          id?: string
          message: string
          platform?: string | null
          status?: string
        }
        Update: {
          ai_reply?: string | null
          contact_id?: string
          contact_name?: string | null
          created_at?: string | null
          gym_id?: string
          id?: string
          message?: string
          platform?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gym_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_users: {
        Row: {
          created_at: string | null
          gym_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          gym_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          gym_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_users_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          booking_subtitle: string | null
          booking_title: string | null
          city: string | null
          created_at: string | null
          display_name: string | null
          gym_config_id: string | null
          hero_image_url: string | null
          id: string
          invite_code: string | null
          is_active: boolean | null
          logo_url: string | null
          max_trials_per_person: number | null
          name: string
          notes: string | null
          primary_color: string | null
          slug: string | null
          social_media_handle: string | null
          status: string | null
          timezone: string | null
        }
        Insert: {
          booking_subtitle?: string | null
          booking_title?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          gym_config_id?: string | null
          hero_image_url?: string | null
          id?: string
          invite_code?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          max_trials_per_person?: number | null
          name: string
          notes?: string | null
          primary_color?: string | null
          slug?: string | null
          social_media_handle?: string | null
          status?: string | null
          timezone?: string | null
        }
        Update: {
          booking_subtitle?: string | null
          booking_title?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string | null
          gym_config_id?: string | null
          hero_image_url?: string | null
          id?: string
          invite_code?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          max_trials_per_person?: number | null
          name?: string
          notes?: string | null
          primary_color?: string | null
          slug?: string | null
          social_media_handle?: string | null
          status?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      human_mode: {
        Row: {
          activated_at: string | null
          gym_id: string
          id: string
          is_human_mode: boolean | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          gym_id: string
          id?: string
          is_human_mode?: boolean | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          gym_id?: string
          id?: string
          is_human_mode?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      lead_tags: {
        Row: {
          created_at: string | null
          experience: string | null
          goal: string | null
          gym_id: string
          id: string
          objection: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          experience?: string | null
          goal?: string | null
          gym_id: string
          id?: string
          objection?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          experience?: string | null
          goal?: string | null
          gym_id?: string
          id?: string
          objection?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          created_at: string | null
          custom_business_description: string | null
          email: string
          full_name: string | null
          gym_id: string | null
          id: string
          industry_id: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          created_at?: string | null
          custom_business_description?: string | null
          email: string
          full_name?: string | null
          gym_id?: string | null
          id: string
          industry_id?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          created_at?: string | null
          custom_business_description?: string | null
          email?: string
          full_name?: string | null
          gym_id?: string | null
          id?: string
          industry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_message:
        | { Args: { p_convo_id: string; p_message: Json }; Returns: undefined }
        | {
            Args: {
              p_content: string
              p_gym_id: string
              p_image_url?: string
              p_role: string
              p_type?: string
              p_user_id: string
            }
            Returns: Json
          }
      get_burst_messages: {
        Args: { p_convo_id: string; p_window_seconds?: number }
        Returns: string
      }
      get_latest_user_msg_index:
        | { Args: { p_convo_id: string }; Returns: number }
        | { Args: { p_gym_id: string; p_user_id: string }; Returns: number }
      get_recent_messages:
        | { Args: { p_convo_id: string; p_limit?: number }; Returns: Json[] }
        | {
            Args: { p_gym_id: string; p_limit?: number; p_user_id: string }
            Returns: Json
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: never; Returns: boolean }
      validate_invite_code: {
        Args: { code: string }
        Returns: {
          gym_name: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "user"],
    },
  },
} as const
