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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          label: string
          last_used_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
        }
        Relationships: []
      }
      gateway_devices: {
        Row: {
          api_key_id: string | null
          created_at: string
          device_id: string
          id: string
          is_active: boolean
          label: string | null
          last_ip: string | null
          last_seen_at: string | null
          phone_number: string | null
          platform: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          device_id: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_ip?: string | null
          last_seen_at?: string | null
          phone_number?: string | null
          platform?: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          device_id?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_ip?: string | null
          last_seen_at?: string | null
          phone_number?: string | null
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_devices_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_accounts: {
        Row: {
          account_number: string
          account_type: string
          created_at: string
          id: string
          is_active: boolean
          merchant_id: string
          provider: string
        }
        Insert: {
          account_number: string
          account_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id: string
          provider: string
        }
        Update: {
          account_number?: string
          account_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_accounts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          account_number: string | null
          callback_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          nagad_number: string
          name: string
          provider: string
        }
        Insert: {
          account_number?: string | null
          callback_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          nagad_number: string
          name: string
          provider?: string
        }
        Update: {
          account_number?: string | null
          callback_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          nagad_number?: string
          name?: string
          provider?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          account_number: string | null
          account_type: string | null
          amount: number
          callback_sent_at: string | null
          callback_status: string | null
          callback_url: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          merchant_id: string
          metadata: Json
          order_id: string | null
          provider: string | null
          redirect_url: string | null
          status: string
          trx_id: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          amount: number
          callback_sent_at?: string | null
          callback_status?: string | null
          callback_url?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          merchant_id: string
          metadata?: Json
          order_id?: string | null
          provider?: string | null
          redirect_url?: string | null
          status?: string
          trx_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          amount?: number
          callback_sent_at?: string | null
          callback_status?: string | null
          callback_url?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          merchant_id?: string
          metadata?: Json
          order_id?: string | null
          provider?: string | null
          redirect_url?: string | null
          status?: string
          trx_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_transactions: {
        Row: {
          account_number: string | null
          account_type: string | null
          amount: number | null
          body: string
          created_at: string
          device_id: string | null
          id: string
          matched_payment_id: string | null
          provider: string | null
          received_at: string
          sender: string
          trx_id: string | null
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          amount?: number | null
          body: string
          created_at?: string
          device_id?: string | null
          id?: string
          matched_payment_id?: string | null
          provider?: string | null
          received_at?: string
          sender: string
          trx_id?: string | null
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          amount?: number | null
          body?: string
          created_at?: string
          device_id?: string | null
          id?: string
          matched_payment_id?: string | null
          provider?: string | null
          received_at?: string
          sender?: string
          trx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_transactions_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
    },
  },
} as const
