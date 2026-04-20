
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          avatar_url: string | null
          is_available: boolean
          last_active_at: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: string
          avatar_url?: string | null
          is_available?: boolean
          last_active_at?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          avatar_url?: string | null
          is_available?: boolean
          last_active_at?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_notifications: {
        Row: {
          id: string
          agent_id: string
          type: string
          title: string
          message: string | null
          conversation_session_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          type: string
          title: string
          message?: string | null
          conversation_session_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          type?: string
          title?: string
          message?: string | null
          conversation_session_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          session_id: string
          status: string
          identification: string | null
          name: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          contract: string | null
          summary: string | null
          specialist_name: string | null
          agent_email: string | null
          glpi_ticket_id: string | null
          notification_sent: boolean
          metadata: Json
          priority: string | null
          closed_by: string | null
          escalated_at: string | null
          created_at: string
          updated_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          status?: string
          identification: string | null
          name?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          contract?: string | null
          summary?: string | null
          specialist_name?: string | null
          agent_email?: string | null
          glpi_ticket_id?: string | null
          notification_sent?: boolean
          metadata?: Json
          priority?: string | null
          closed_by?: string | null
          escalated_at?: string | null
          created_at?: string
          updated_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          status?: string
          identification?: string | null
          name?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          contract?: string | null
          summary?: string | null
          specialist_name?: string | null
          agent_email?: string | null
          glpi_ticket_id?: string | null
          notification_sent?: boolean
          metadata?: Json
          priority?: string | null
          closed_by?: string | null
          escalated_at?: string | null
          created_at?: string
          updated_at?: string
          closed_at?: string | null
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          id: number
          conversation_id: string
          role: string
          content: string
          author_name: string | null
          created_at: string
          attachments: Json | null
        }
        Insert: {
          id?: number
          conversation_id: string
          role: string
          content: string
          author_name?: string | null
          created_at?: string
          attachments?: Json | null
        }
        Update: {
          id?: number
          conversation_id?: string
          role?: string
          content?: string
          author_name?: string | null
          created_at?: string
          attachments?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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


export type Agent = Tables<"agents">;
export type AgentNotification = Tables<"agent_notifications">;

export type AgentInsert = TablesInsert<"agents">;
export type AgentNotificationInsert = TablesInsert<"agent_notifications">;

export type AgentUpdate = TablesUpdate<"agents">;

export type AgentRole = "admin" | "supervisor" | "agent";

export type NotificationType = "new_escalation" | "conversation_update" | "system";

export interface AgentSettings {
  notifications?: {
    sound?: boolean;
    desktop?: boolean;
    email?: boolean;
  };
  theme?: "light" | "dark" | "system";
  language?: string;
}
