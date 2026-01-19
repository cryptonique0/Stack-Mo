export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key: string;
          created_at: string;
          id: string;
          is_active: boolean;
          key_name: string;
          last_used_at: string | null;
          merchant_id: string;
          updated_at: string;
        };
        Insert: {
          api_key: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key_name: string;
          last_used_at?: string | null;
          merchant_id: string;
          updated_at?: string;
        };
        Update: {
          api_key?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key_name?: string;
          last_used_at?: string | null;
          merchant_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      escrow: {
        Row: {
          amount_btc: number;
          amount_usd: number | null;
          created_at: string;
          id: string;
          is_released: boolean;
          merchant_id: string;
          release_date: string | null;
          transaction_id: string;
        };
        Insert: {
          amount_btc: number;
          amount_usd?: number | null;
          created_at?: string;
          id?: string;
          is_released?: boolean;
          merchant_id: string;
          release_date?: string | null;
          transaction_id: string;
        };
        Update: {
          amount_btc?: number;
          amount_usd?: number | null;
          created_at?: string;
          id?: string;
          is_released?: boolean;
          merchant_id?: string;
          release_date?: string | null;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escrow_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchant_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escrow_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount_btc: number;
          amount_usd: number | null;
          created_at: string;
          currency: string | null;
          customer_email: string | null;
          customer_name: string;
          description: string;
          due_date: string | null;
          expiry_blocks: number | null;
          expiry_minutes: number | null;
          id: string;
          merchant_id: string;
          paid_at: string | null;
          payment_link: string;
          qr_code: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          updated_at: string;
        };
        Insert: {
          amount_btc: number;
          amount_usd?: number | null;
          created_at?: string;
          currency?: string | null;
          customer_email?: string | null;
          customer_name: string;
          description: string;
          due_date?: string | null;
          expiry_blocks?: number | null;
          expiry_minutes?: number | null;
          id?: string;
          merchant_id: string;
          paid_at?: string | null;
          payment_link: string;
          qr_code?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          updated_at?: string;
        };
        Update: {
          amount_btc?: number;
          amount_usd?: number | null;
          created_at?: string;
          currency?: string | null;
          customer_email?: string | null;
          customer_name?: string;
          description?: string;
          due_date?: string | null;
          expiry_blocks?: number | null;
          expiry_minutes?: number | null;
          id?: string;
          merchant_id?: string;
          paid_at?: string | null;
          payment_link?: string;
          qr_code?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchant_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      merchant_profiles: {
        Row: {
          api_key_prefix: string | null;
          business_category: Database["public"]["Enums"]["business_category"];
          business_name: string;
          business_website: string | null;
          country: string;
          created_at: string;
          fee_recipient_address: string | null;
          first_name: string;
          id: string;
          last_name: string;
          testnet_mode: boolean;
          updated_at: string;
          user_id: string;
          webhook_url: string | null;
        };
        Insert: {
          api_key_prefix?: string | null;
          business_category: Database["public"]["Enums"]["business_category"];
          business_name: string;
          business_website?: string | null;
          country: string;
          created_at?: string;
          fee_recipient_address?: string | null;
          first_name: string;
          id?: string;
          last_name: string;
          testnet_mode?: boolean;
          updated_at?: string;
          user_id: string;
          webhook_url?: string | null;
        };
        Update: {
          api_key_prefix?: string | null;
          business_category?: Database["public"]["Enums"]["business_category"];
          business_name?: string;
          business_website?: string | null;
          country?: string;
          created_at?: string;
          fee_recipient_address?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          testnet_mode?: boolean;
          updated_at?: string;
          user_id?: string;
          webhook_url?: string | null;
        };
        Relationships: [];
      };
      subscription_payments: {
        Row: {
          amount_btc: number;
          amount_usd: number | null;
          created_at: string;
          id: string;
          paid_at: string | null;
          payment_block_height: number | null;
          status: string;
          subscription_id: string;
          transaction_id: string | null;
        };
        Insert: {
          amount_btc: number;
          amount_usd?: number | null;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          payment_block_height?: number | null;
          status?: string;
          subscription_id: string;
          transaction_id?: string | null;
        };
        Update: {
          amount_btc?: number;
          amount_usd?: number | null;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          payment_block_height?: number | null;
          status?: string;
          subscription_id?: string;
          transaction_id?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          amount_btc: number;
          amount_usd: number | null;
          created_at: string;
          customer_id: string;
          id: string;
          interval_type: string;
          interval_value: number;
          last_payment_at: string | null;
          merchant_id: string;
          next_payment_at: string;
          status: string;
          subscription_name: string;
          updated_at: string;
        };
        Insert: {
          amount_btc: number;
          amount_usd?: number | null;
          created_at?: string;
          customer_id: string;
          id?: string;
          interval_type: string;
          interval_value: number;
          last_payment_at?: string | null;
          merchant_id: string;
          next_payment_at: string;
          status?: string;
          subscription_name: string;
          updated_at?: string;
        };
        Update: {
          amount_btc?: number;
          amount_usd?: number | null;
          created_at?: string;
          customer_id?: string;
          id?: string;
          interval_type?: string;
          interval_value?: number;
          last_payment_at?: string | null;
          merchant_id?: string;
          next_payment_at?: string;
          status?: string;
          subscription_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount_btc: number;
          amount_usd: number | null;
          confirmation_count: number | null;
          created_at: string;
          escrow_release_date: string | null;
          escrow_released: boolean;
          id: string;
          invoice_id: string;
          merchant_id: string;
          status: Database["public"]["Enums"]["transaction_status"];
          transaction_hash: string | null;
          updated_at: string;
        };
        Insert: {
          amount_btc: number;
          amount_usd?: number | null;
          confirmation_count?: number | null;
          created_at?: string;
          escrow_release_date?: string | null;
          escrow_released?: boolean;
          id?: string;
          invoice_id: string;
          merchant_id: string;
          status?: Database["public"]["Enums"]["transaction_status"];
          transaction_hash?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_btc?: number;
          amount_usd?: number | null;
          confirmation_count?: number | null;
          created_at?: string;
          escrow_release_date?: string | null;
          escrow_released?: boolean;
          id?: string;
          invoice_id?: string;
          merchant_id?: string;
          status?: Database["public"]["Enums"]["transaction_status"];
          transaction_hash?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchant_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          balance_btc: number | null;
          balance_stx: number | null;
          created_at: string;
          id: string;
          is_active: boolean;
          merchant_id: string;
          wallet_address: string;
          wallet_type: string;
        };
        Insert: {
          balance_btc?: number | null;
          balance_stx?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          merchant_id: string;
          wallet_address: string;
          wallet_type?: string;
        };
        Update: {
          balance_btc?: number | null;
          balance_stx?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          merchant_id?: string;
          wallet_address?: string;
          wallet_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchant_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_logs: {
        Row: {
          attempts: number;
          created_at: string;
          event_type: string;
          id: string;
          last_attempt_at: string;
          merchant_id: string;
          payload: Json;
          response_body: string | null;
          response_status: number | null;
          success: boolean;
          webhook_url: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          event_type: string;
          id?: string;
          last_attempt_at?: string;
          merchant_id: string;
          payload: Json;
          response_body?: string | null;
          response_status?: number | null;
          success?: boolean;
          webhook_url: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          event_type?: string;
          id?: string;
          last_attempt_at?: string;
          merchant_id?: string;
          payload?: Json;
          response_body?: string | null;
          response_status?: number | null;
          success?: boolean;
          webhook_url?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          created_at: string;
          expected_amount: number;
          currency: string;
          description: string;
          status: string;
          email: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          expected_amount?: number;
          currency?: string;
          description?: string;
          status?: string;
          email?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          expected_amount?: number;
          currency?: string;
          description?: string;
          status?: string;
          email?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      business_category:
        | "retail"
        | "saas"
        | "freelance_services"
        | "ngo"
        | "consulting"
        | "e_commerce"
        | "marketplace"
        | "subscription"
        | "other";
      invoice_status: "pending" | "paid" | "expired" | "cancelled";
      transaction_status: "pending" | "completed" | "failed" | "refunded";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      business_category: [
        "retail",
        "saas",
        "freelance_services",
        "ngo",
        "consulting",
        "e_commerce",
        "marketplace",
        "subscription",
        "other",
      ],
      invoice_status: ["pending", "paid", "expired", "cancelled"],
      transaction_status: ["pending", "completed", "failed", "refunded"],
    },
  },
} as const;
