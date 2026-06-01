// Tipos gerados do schema Supabase (projeto jotaduo-agentes).
// Regenerar com: supabase MCP `generate_typescript_types` ou `supabase gen types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          is_active: boolean;
          model: string;
          owner_id: string;
          skills: string[];
          system_prompt: string;
          template_id: string | null;
          tone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          is_active?: boolean;
          model?: string;
          owner_id: string;
          skills?: string[];
          system_prompt?: string;
          template_id?: string | null;
          tone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          is_active?: boolean;
          model?: string;
          owner_id?: string;
          skills?: string[];
          system_prompt?: string;
          template_id?: string | null;
          tone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          agent_id: string;
          channel: string;
          created_at: string;
          external_id: string | null;
          id: string;
        };
        Insert: {
          agent_id: string;
          channel?: string;
          created_at?: string;
          external_id?: string | null;
          id?: string;
        };
        Update: {
          agent_id?: string;
          channel?: string;
          created_at?: string;
          external_id?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      templates: {
        Row: {
          created_at: string;
          default_agent_name: string | null;
          default_system_prompt: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          default_agent_name?: string | null;
          default_system_prompt: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          default_agent_name?: string | null;
          default_system_prompt?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      whatsapp_connections: {
        Row: {
          agent_id: string;
          connect_requested: boolean;
          last_connected_at: string | null;
          last_error: string | null;
          phone_number: string | null;
          qr_code: string | null;
          status: Database["public"]["Enums"]["conn_status"];
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          connect_requested?: boolean;
          last_connected_at?: string | null;
          last_error?: string | null;
          phone_number?: string | null;
          qr_code?: string | null;
          status?: Database["public"]["Enums"]["conn_status"];
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          connect_requested?: boolean;
          last_connected_at?: string | null;
          last_error?: string | null;
          phone_number?: string | null;
          qr_code?: string | null;
          status?: Database["public"]["Enums"]["conn_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      whatsapp_sessions: {
        Row: {
          agent_id: string;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          agent_id: string;
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          agent_id?: string;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      instagram_connections: {
        Row: {
          agent_id: string;
          auth_type: string;
          ig_user_id: string | null;
          last_error: string | null;
          status: Database["public"]["Enums"]["ig_status"];
          token_expires_at: string | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          agent_id: string;
          auth_type?: string;
          ig_user_id?: string | null;
          last_error?: string | null;
          status?: Database["public"]["Enums"]["ig_status"];
          token_expires_at?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          agent_id?: string;
          auth_type?: string;
          ig_user_id?: string | null;
          last_error?: string | null;
          status?: Database["public"]["Enums"]["ig_status"];
          token_expires_at?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      instagram_secrets: {
        Row: {
          access_token: string;
          agent_id: string;
          updated_at: string;
        };
        Insert: {
          access_token: string;
          agent_id: string;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          agent_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posters: {
        Row: {
          agent_id: string;
          briefing: string;
          caption: string | null;
          created_at: string;
          created_by: string | null;
          error: string | null;
          id: string;
          ig_media_id: string | null;
          ig_permalink: string | null;
          image_path: string | null;
          image_prompt: string | null;
          image_url: string | null;
          published_at: string | null;
          size: string;
          status: Database["public"]["Enums"]["poster_status"];
          updated_at: string;
        };
        Insert: {
          agent_id: string;
          briefing: string;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          id?: string;
          ig_media_id?: string | null;
          ig_permalink?: string | null;
          image_path?: string | null;
          image_prompt?: string | null;
          image_url?: string | null;
          published_at?: string | null;
          size?: string;
          status?: Database["public"]["Enums"]["poster_status"];
          updated_at?: string;
        };
        Update: {
          agent_id?: string;
          briefing?: string;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          error?: string | null;
          id?: string;
          ig_media_id?: string | null;
          ig_permalink?: string | null;
          image_path?: string | null;
          image_prompt?: string | null;
          image_url?: string | null;
          published_at?: string | null;
          size?: string;
          status?: Database["public"]["Enums"]["poster_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "client";
      conn_status:
        | "disconnected"
        | "qr_pending"
        | "connecting"
        | "connected"
        | "logged_out"
        | "error";
      ig_status: "disconnected" | "connected" | "error";
      poster_status:
        | "draft"
        | "generating"
        | "ready"
        | "publishing"
        | "published"
        | "failed";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
