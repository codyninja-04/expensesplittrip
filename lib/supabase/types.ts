// Hand-written to mirror supabase/migrations/001_initial_schema.sql.
// Regenerate with `npx supabase gen types typescript` once the project is live
// if the schema changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string;
          created_by: string;
          created_at: string;
          name: string;
          base_currency: string;
          invite_code: string;
          status: 'active' | 'settled';
        };
        Insert: {
          id?: string;
          created_by: string;
          created_at?: string;
          name: string;
          base_currency?: string;
          invite_code?: string;
          status?: 'active' | 'settled';
        };
        Update: {
          name?: string;
          base_currency?: string;
          status?: 'active' | 'settled';
        };
        Relationships: [];
      };
      trip_members: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string | null;
          display_name: string;
          paynow_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id?: string | null;
          display_name: string;
          paynow_number?: string | null;
          created_at?: string;
        };
        Update: {
          display_name?: string;
          paynow_number?: string | null;
        };
        Relationships: [];
      };
      trip_expenses: {
        Row: {
          id: string;
          trip_id: string;
          added_by: string | null;
          created_at: string;
          description: string;
          amount_original: number;
          currency_original: string;
          amount_base_currency: number;
          exchange_rate: number | null;
          category: string;
          paid_by: string;
          split_among: string[];
          photo_url: string | null;
        };
        Insert: {
          id?: string;
          trip_id: string;
          added_by?: string | null;
          created_at?: string;
          description: string;
          amount_original: number;
          currency_original: string;
          amount_base_currency: number;
          exchange_rate?: number | null;
          category?: string;
          paid_by: string;
          split_among: string[];
          photo_url?: string | null;
        };
        Update: {
          description?: string;
          amount_original?: number;
          currency_original?: string;
          amount_base_currency?: number;
          exchange_rate?: number | null;
          category?: string;
          paid_by?: string;
          split_among?: string[];
          photo_url?: string | null;
        };
        Relationships: [];
      };
      settlement_payments: {
        Row: {
          id: string;
          trip_id: string;
          from_member: string;
          to_member: string;
          amount: number;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          from_member: string;
          to_member: string;
          amount: number;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
        };
        Relationships: [];
      };
    };
    Views: { [key: string]: never };
    Functions: {
      create_trip: {
        Args: {
          p_name: string;
          p_base_currency: string;
          p_display_name: string;
          p_paynow_number?: string | null;
          p_other_members?: string[];
        };
        Returns: string;
      };
      get_trip_invite: {
        Args: { p_invite_code: string };
        Returns: Json;
      };
      join_trip: {
        Args: {
          p_invite_code: string;
          p_member_id?: string | null;
          p_display_name?: string | null;
        };
        Returns: string;
      };
      is_trip_member: {
        Args: { p_trip_id: string };
        Returns: boolean;
      };
    };
    Enums: { [key: string]: never };
    CompositeTypes: { [key: string]: never };
  };
}
