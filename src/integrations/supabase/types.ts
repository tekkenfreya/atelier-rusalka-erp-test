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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cloud_storage_integrations: {
        Row: {
          access_token: string | null
          connected_at: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_connected: boolean | null
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_connected?: boolean | null
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_connected?: boolean | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      export_history: {
        Row: {
          completed_at: string | null
          error_message: string | null
          file_name: string | null
          file_size: number | null
          id: string
          scheduled_export_id: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          scheduled_export_id: string
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          scheduled_export_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_history_scheduled_export_id_fkey"
            columns: ["scheduled_export_id"]
            isOneToOne: false
            referencedRelation: "scheduled_exports"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          amount_in_stock: number | null
          comments: string | null
          created_at: string | null
          function: string | null
          id: string
          image_url: string | null
          ingredient_id: string | null
          last_order_date: string | null
          last_order_quantity: number | null
          life_expectancy: string | null
          name: string
          other_suppliers: string | null
          quantity_unit: string | null
          scientific_name: string | null
          supplier_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          amount_in_stock?: number | null
          comments?: string | null
          created_at?: string | null
          function?: string | null
          id?: string
          image_url?: string | null
          ingredient_id?: string | null
          last_order_date?: string | null
          last_order_quantity?: number | null
          life_expectancy?: string | null
          name: string
          other_suppliers?: string | null
          quantity_unit?: string | null
          scientific_name?: string | null
          supplier_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_in_stock?: number | null
          comments?: string | null
          created_at?: string | null
          function?: string | null
          id?: string
          image_url?: string | null
          ingredient_id?: string | null
          last_order_date?: string | null
          last_order_quantity?: number | null
          life_expectancy?: string | null
          name?: string
          other_suppliers?: string | null
          quantity_unit?: string | null
          scientific_name?: string | null
          supplier_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          order_amount: number
          order_id: string
          original_order_amount: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          order_amount: number
          order_id: string
          original_order_amount?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          order_amount?: number
          order_id?: string
          original_order_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          order_number: string
          supplier_id: string
          supplier_name: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_number: string
          supplier_id: string
          supplier_name: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_number?: string
          supplier_id?: string
          supplier_name?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ingredients: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string
          percentage: string
          phase: string | null
          product_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id: string
          percentage: string
          phase?: string | null
          product_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string
          percentage?: string
          phase?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_method_steps: {
        Row: {
          content: string
          created_at: string | null
          id: string
          product_id: string
          sort_order: number
          step_number: string
          step_type: string
        }
        Insert: {
          content?: string
          created_at?: string | null
          id?: string
          product_id: string
          sort_order?: number
          step_number: string
          step_type?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          product_id?: string
          sort_order?: number
          step_number?: string
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_method_steps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          formulator: string | null
          formulator_email: string | null
          id: string
          manufacturer_id: string | null
          name: string
          product_level: string | null
          skin_type: string | null
          status_of_tests: string | null
          testing_organism: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          formulator?: string | null
          formulator_email?: string | null
          id?: string
          manufacturer_id?: string | null
          name: string
          product_level?: string | null
          skin_type?: string | null
          status_of_tests?: string | null
          testing_organism?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          formulator?: string | null
          formulator_email?: string | null
          id?: string
          manufacturer_id?: string | null
          name?: string
          product_level?: string | null
          skin_type?: string | null
          status_of_tests?: string | null
          testing_organism?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_subscriptions: {
        Row: {
          batch_config: Json | null
          created_at: string
          email: string
          filter_supplier_id: string | null
          frequency: string
          id: string
          include_batch_config: boolean
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          report_type: string
          scheduled_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_config?: Json | null
          created_at?: string
          email: string
          filter_supplier_id?: string | null
          frequency: string
          id?: string
          include_batch_config?: boolean
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          report_type: string
          scheduled_hour?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_config?: Json | null
          created_at?: string
          email?: string
          filter_supplier_id?: string | null
          frequency?: string
          id?: string
          include_batch_config?: boolean
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          report_type?: string
          scheduled_hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_subscriptions_filter_supplier_id_fkey"
            columns: ["filter_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_exports: {
        Row: {
          batch_config: Json | null
          created_at: string
          fields: string[]
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          batch_config?: Json | null
          created_at?: string
          fields: string[]
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          batch_config?: Json | null
          created_at?: string
          fields?: string[]
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_exports: {
        Row: {
          created_at: string
          destination: string
          destination_path: string | null
          email: string | null
          format: string
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          saved_export_id: string
          scheduled_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination: string
          destination_path?: string | null
          email?: string | null
          format?: string
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          saved_export_id: string
          scheduled_hour?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination?: string
          destination_path?: string | null
          email?: string | null
          format?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          saved_export_id?: string
          scheduled_hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_exports_saved_export_id_fkey"
            columns: ["saved_export_id"]
            isOneToOne: false
            referencedRelation: "saved_exports"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_project_cards: {
        Row: {
          created_at: string
          created_by: string
          id: string
          product_id: string
          sort_order: number
          stage: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          product_id: string
          sort_order?: number
          stage?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          product_id?: string
          sort_order?: number
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_project_cards_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      app_role: "admin" | "user" | "editor"
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
      app_role: ["admin", "user", "editor"],
    },
  },
} as const
