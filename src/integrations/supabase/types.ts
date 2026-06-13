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
          booking_date: string | null
          booking_time: string | null
          business_id: string
          contact_id: string
          created_at: string
          id: string
          location: string | null
          name: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string
        }
        Insert: {
          booking_date?: string | null
          booking_time?: string | null
          business_id: string
          contact_id: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          booking_date?: string | null
          booking_time?: string | null
          business_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_assets: {
        Row: {
          asset_type: string | null
          business_id: string
          created_at: string | null
          description: string
          id: string
          tag_key: string | null
          tags: string[] | null
          url: string
        }
        Insert: {
          asset_type?: string | null
          business_id: string
          created_at?: string | null
          description: string
          id?: string
          tag_key?: string | null
          tags?: string[] | null
          url: string
        }
        Update: {
          asset_type?: string | null
          business_id?: string
          created_at?: string | null
          description?: string
          id?: string
          tag_key?: string | null
          tags?: string[] | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_configs: {
        Row: {
          ai_goal: string | null
          ai_name: string | null
          ai_personality: string | null
          bad_lead_definition: string | null
          bio: string | null
          booking_fields: Json | null
          business_id: string | null
          business_type: string | null
          chat_response_style: string | null
          created_at: string
          custom_instructions: string | null
          demo_mode: boolean | null
          demo_trigger_word: string | null
          escalation_contact: string | null
          escalation_enabled: boolean | null
          escalation_rules: Json | null
          follow_up_delay_hours: number | null
          follow_up_enabled: boolean | null
          follow_up_max: number | null
          follow_up_tone: string | null
          goals: Json | null
          id: string
          invite_code: string | null
          knowledge: Json | null
          lead_silent_hours: number | null
          manager_name: string | null
          manychat_api_key: string | null
          model: string | null
          niche: string | null
          onboarding_complete: boolean | null
          persona: Json | null
          photo_map: Json | null
          qualification_questions: Json | null
          qualification_strictness: string | null
          response_length_style: string
          specific_keywords: string[] | null
          staff_invite_code: string | null
          system_prompt: string | null
          trial_mode: boolean | null
          workspace_name: string | null
        }
        Insert: {
          ai_goal?: string | null
          ai_name?: string | null
          ai_personality?: string | null
          bad_lead_definition?: string | null
          bio?: string | null
          booking_fields?: Json | null
          business_id?: string | null
          business_type?: string | null
          chat_response_style?: string | null
          created_at?: string
          custom_instructions?: string | null
          demo_mode?: boolean | null
          demo_trigger_word?: string | null
          escalation_contact?: string | null
          escalation_enabled?: boolean | null
          escalation_rules?: Json | null
          follow_up_delay_hours?: number | null
          follow_up_enabled?: boolean | null
          follow_up_max?: number | null
          follow_up_tone?: string | null
          goals?: Json | null
          id?: string
          invite_code?: string | null
          knowledge?: Json | null
          lead_silent_hours?: number | null
          manager_name?: string | null
          manychat_api_key?: string | null
          model?: string | null
          niche?: string | null
          onboarding_complete?: boolean | null
          persona?: Json | null
          photo_map?: Json | null
          qualification_questions?: Json | null
          qualification_strictness?: string | null
          response_length_style?: string
          specific_keywords?: string[] | null
          staff_invite_code?: string | null
          system_prompt?: string | null
          trial_mode?: boolean | null
          workspace_name?: string | null
        }
        Update: {
          ai_goal?: string | null
          ai_name?: string | null
          ai_personality?: string | null
          bad_lead_definition?: string | null
          bio?: string | null
          booking_fields?: Json | null
          business_id?: string | null
          business_type?: string | null
          chat_response_style?: string | null
          created_at?: string
          custom_instructions?: string | null
          demo_mode?: boolean | null
          demo_trigger_word?: string | null
          escalation_contact?: string | null
          escalation_enabled?: boolean | null
          escalation_rules?: Json | null
          follow_up_delay_hours?: number | null
          follow_up_enabled?: boolean | null
          follow_up_max?: number | null
          follow_up_tone?: string | null
          goals?: Json | null
          id?: string
          invite_code?: string | null
          knowledge?: Json | null
          lead_silent_hours?: number | null
          manager_name?: string | null
          manychat_api_key?: string | null
          model?: string | null
          niche?: string | null
          onboarding_complete?: boolean | null
          persona?: Json | null
          photo_map?: Json | null
          qualification_questions?: Json | null
          qualification_strictness?: string | null
          response_length_style?: string
          specific_keywords?: string[] | null
          staff_invite_code?: string | null
          system_prompt?: string | null
          trial_mode?: boolean | null
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          config_id: string | null
          created_at: string
          custom_domain: string | null
          display_name: string
          id: string
          invite_code: string | null
          logo_url: string | null
          staff_invite_code: string | null
        }
        Insert: {
          config_id?: string | null
          created_at?: string
          custom_domain?: string | null
          display_name: string
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          staff_invite_code?: string | null
        }
        Update: {
          config_id?: string | null
          created_at?: string
          custom_domain?: string | null
          display_name?: string
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          staff_invite_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "business_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          ai_activated: boolean | null
          ai_activated_at: string | null
          ai_paused: boolean
          ai_processing: boolean | null
          ai_processing_at: string | null
          business_id: string
          conversation_state: Json | null
          conversation_tag: string | null
          created_at: string
          email: string | null
          escalated_at: string | null
          escalation_reason: string | null
          follow_up_count: number | null
          follow_up_scheduled_at: string | null
          follow_up_sent_at: string | null
          goal: string | null
          id: string
          last_staff_reply_at: string | null
          location: string | null
          messages: Json
          name: string | null
          notes: string | null
          paused_at: string | null
          paused_by: string | null
          phone: string | null
          platform: string | null
          platform_id: string | null
          resolved_at: string | null
          score: string | null
          score_reason: string | null
          source: string | null
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          ai_activated?: boolean | null
          ai_activated_at?: string | null
          ai_paused?: boolean
          ai_processing?: boolean | null
          ai_processing_at?: string | null
          business_id: string
          conversation_state?: Json | null
          conversation_tag?: string | null
          created_at?: string
          email?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          follow_up_count?: number | null
          follow_up_scheduled_at?: string | null
          follow_up_sent_at?: string | null
          goal?: string | null
          id?: string
          last_staff_reply_at?: string | null
          location?: string | null
          messages?: Json
          name?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_by?: string | null
          phone?: string | null
          platform?: string | null
          platform_id?: string | null
          resolved_at?: string | null
          score?: string | null
          score_reason?: string | null
          source?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          ai_activated?: boolean | null
          ai_activated_at?: string | null
          ai_paused?: boolean
          ai_processing?: boolean | null
          ai_processing_at?: string | null
          business_id?: string
          conversation_state?: Json | null
          conversation_tag?: string | null
          created_at?: string
          email?: string | null
          escalated_at?: string | null
          escalation_reason?: string | null
          follow_up_count?: number | null
          follow_up_scheduled_at?: string | null
          follow_up_sent_at?: string | null
          goal?: string | null
          id?: string
          last_staff_reply_at?: string | null
          location?: string | null
          messages?: Json
          name?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_by?: string | null
          phone?: string | null
          platform?: string | null
          platform_id?: string | null
          resolved_at?: string | null
          score?: string | null
          score_reason?: string | null
          source?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_examples: {
        Row: {
          business_id: string | null
          created_at: string | null
          emotion: string | null
          example_text: string
          id: string
          intent_tags: string[] | null
          language: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          emotion?: string | null
          example_text: string
          id?: string
          intent_tags?: string[] | null
          language?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          emotion?: string | null
          example_text?: string
          id?: string
          intent_tags?: string[] | null
          language?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_examples_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      escalated_questions: {
        Row: {
          business_id: string
          contact_id: string | null
          created_at: string
          id: string
          question: string | null
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          business_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          question?: string | null
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          business_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          question?: string | null
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalated_questions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalated_questions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          business_id: string
          category: string | null
          comment: string | null
          contact_id: string | null
          created_at: string
          id: string
          rating: number | null
          submitted_by: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          comment?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          submitted_by?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          comment?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          business_id: string
          contact_id: string
          created_at: string
          follow_up_type: string | null
          id: string
          message: string | null
          scheduled_at: string | null
          sent: boolean
          sent_at: string | null
        }
        Insert: {
          business_id: string
          contact_id: string
          created_at?: string
          follow_up_type?: string | null
          id?: string
          message?: string | null
          scheduled_at?: string | null
          sent?: boolean
          sent_at?: string | null
        }
        Update: {
          business_id?: string
          contact_id?: string
          created_at?: string
          follow_up_type?: string | null
          id?: string
          message?: string | null
          scheduled_at?: string | null
          sent?: boolean
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      notify_list: {
        Row: {
          created_at: string
          email: string | null
          id: number
          instagram: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: never
          instagram?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: never
          instagram?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string
          business_description: string | null
          business_id: string | null
          business_type: string | null
          created_at: string
          full_name: string | null
          id: string
          niche: string | null
          role: string
        }
        Insert: {
          approval_status?: string
          business_description?: string | null
          business_id?: string | null
          business_type?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          niche?: string | null
          role?: string
        }
        Update: {
          approval_status?: string
          business_description?: string | null
          business_id?: string | null
          business_type?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          niche?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          created_at: string | null
          id: string
          q1: string
          q2: string
          q3: string
          q4: string
          q5: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          q1: string
          q2: string
          q3: string
          q4: string
          q5: string
        }
        Update: {
          created_at?: string | null
          id?: string
          q1?: string
          q2?: string
          q3?: string
          q4?: string
          q5?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_message:
        | {
            Args: { p_contact_id: string; p_message: Json }
            Returns: undefined
          }
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
      current_business_id: { Args: never; Returns: string }
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
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      regenerate_invite_code: { Args: { code_type: string }; Returns: string }
      validate_invite_code: { Args: { code: string }; Returns: Json }
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
