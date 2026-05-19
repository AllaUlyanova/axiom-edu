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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          description: string | null
          earned_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          code: string
          description?: string | null
          earned_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          code?: string
          description?: string | null
          earned_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      book_chunks: {
        Row: {
          book_id: string
          content: string
          created_at: string
          embedding: string
          id: string
          kind: string
          lesson_id: string | null
          page_number: number | null
          unit_id: string | null
        }
        Insert: {
          book_id: string
          content: string
          created_at?: string
          embedding: string
          id?: string
          kind?: string
          lesson_id?: string | null
          page_number?: number | null
          unit_id?: string | null
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          kind?: string
          lesson_id?: string | null
          page_number?: number | null
          unit_id?: string | null
        }
        Relationships: []
      }
      book_pages: {
        Row: {
          book_id: string
          created_at: string
          id: string
          image_url: string
          ocr_text: string | null
          page_number: number
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          image_url: string
          ocr_text?: string | null
          page_number: number
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          image_url?: string
          ocr_text?: string | null
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_pages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          grade: number
          id: string
          page_offset: number
          pages_count: number | null
          pdf_url: string | null
          sort_order: number
          subject_id: string
          title: string
          type: Database["public"]["Enums"]["book_type"]
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          grade?: number
          id?: string
          page_offset?: number
          pages_count?: number | null
          pdf_url?: string | null
          sort_order?: number
          subject_id: string
          title: string
          type?: Database["public"]["Enums"]["book_type"]
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          grade?: number
          id?: string
          page_offset?: number
          pages_count?: number | null
          pdf_url?: string | null
          sort_order?: number
          subject_id?: string
          title?: string
          type?: Database["public"]["Enums"]["book_type"]
        }
        Relationships: [
          {
            foreignKeyName: "books_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          instruction: string | null
          lesson_id: string
          number: string
          page_number: number | null
          prompt: string | null
          sort_order: number
          source_image_url: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instruction?: string | null
          lesson_id: string
          number: string
          page_number?: number | null
          prompt?: string | null
          sort_order?: number
          source_image_url?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instruction?: string | null
          lesson_id?: string
          number?: string
          page_number?: number | null
          prompt?: string | null
          sort_order?: number
          source_image_url?: string | null
          type?: string | null
        }
        Relationships: []
      }
      grammar_topics: {
        Row: {
          book_id: string
          created_at: string
          examples: Json | null
          id: string
          lesson_id: string | null
          page_number: number | null
          rule_md: string | null
          title: string
          unit_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          examples?: Json | null
          id?: string
          lesson_id?: string | null
          page_number?: number | null
          rule_md?: string | null
          title: string
          unit_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          examples?: Json | null
          id?: string
          lesson_id?: string | null
          page_number?: number | null
          rule_md?: string | null
          title?: string
          unit_id?: string | null
        }
        Relationships: []
      }
      ingest_jobs: {
        Row: {
          book_id: string
          error: string | null
          finished_at: string | null
          id: string
          log: string | null
          progress: number
          started_at: string | null
          status: string
          total: number
        }
        Insert: {
          book_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          log?: string | null
          progress?: number
          started_at?: string | null
          status?: string
          total?: number
        }
        Update: {
          book_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          log?: string | null
          progress?: number
          started_at?: string | null
          status?: string
          total?: number
        }
        Relationships: []
      }
      lessons: {
        Row: {
          book_id: string
          content_md: string | null
          created_at: string
          id: string
          number: number
          ocr_text: string | null
          page_from: number | null
          page_to: number | null
          slug: string
          sort_order: number
          subject_id: string
          summary: string | null
          title: string
          unit_id: string | null
        }
        Insert: {
          book_id: string
          content_md?: string | null
          created_at?: string
          id?: string
          number: number
          ocr_text?: string | null
          page_from?: number | null
          page_to?: number | null
          slug: string
          sort_order?: number
          subject_id: string
          summary?: string | null
          title: string
          unit_id?: string | null
        }
        Update: {
          book_id?: string
          content_md?: string | null
          created_at?: string
          id?: string
          number?: number
          ocr_text?: string | null
          page_from?: number | null
          page_to?: number | null
          slug?: string
          sort_order?: number
          subject_id?: string
          summary?: string | null
          title?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          grade: number | null
          id: string
          last_active_at: string | null
          streak: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          grade?: number | null
          id: string
          last_active_at?: string | null
          streak?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          grade?: number | null
          id?: string
          last_active_at?: string | null
          streak?: number
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string
          score: number | null
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: string
          score?: number | null
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string
          score?: number | null
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      submissions: {
        Row: {
          ai_explanation: string | null
          ai_hint: string | null
          ai_similar: Json | null
          ai_steps: Json | null
          ai_verdict: string | null
          answer_text: string | null
          created_at: string
          id: string
          image_url: string | null
          is_correct: boolean | null
          lesson_id: string | null
          subject_id: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          ai_hint?: string | null
          ai_similar?: Json | null
          ai_steps?: Json | null
          ai_verdict?: string | null
          answer_text?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          lesson_id?: string | null
          subject_id?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          ai_hint?: string | null
          ai_similar?: Json | null
          ai_steps?: Json | null
          ai_verdict?: string | null
          answer_text?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_correct?: boolean | null
          lesson_id?: string | null
          subject_id?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          answer: string | null
          created_at: string
          difficulty: number | null
          exercise_id: string | null
          hints: string[] | null
          id: string
          lesson_id: string
          number: number
          page_number: number | null
          prompt: string
          solution_md: string | null
          source_image_url: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string
          difficulty?: number | null
          exercise_id?: string | null
          hints?: string[] | null
          id?: string
          lesson_id: string
          number: number
          page_number?: number | null
          prompt: string
          solution_md?: string | null
          source_image_url?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string
          difficulty?: number | null
          exercise_id?: string | null
          hints?: string[] | null
          id?: string
          lesson_id?: string
          number?: number
          page_number?: number | null
          prompt?: string
          solution_md?: string | null
          source_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          book_id: string
          created_at: string
          id: string
          number: number
          page_from: number | null
          page_to: number | null
          sort_order: number
          summary: string | null
          title: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          number: number
          page_from?: number | null
          page_to?: number | null
          sort_order?: number
          summary?: string | null
          title: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          number?: number
          page_from?: number | null
          page_to?: number | null
          sort_order?: number
          summary?: string | null
          title?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      vocabulary: {
        Row: {
          book_id: string
          created_at: string
          example: string | null
          id: string
          lesson_id: string | null
          page_number: number | null
          transcription: string | null
          translation: string | null
          unit_id: string | null
          word: string
        }
        Insert: {
          book_id: string
          created_at?: string
          example?: string | null
          id?: string
          lesson_id?: string | null
          page_number?: number | null
          transcription?: string | null
          translation?: string | null
          unit_id?: string | null
          word: string
        }
        Update: {
          book_id?: string
          created_at?: string
          example?: string | null
          id?: string
          lesson_id?: string | null
          page_number?: number | null
          transcription?: string | null
          translation?: string | null
          unit_id?: string | null
          word?: string
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
      match_book_chunks: {
        Args: {
          book_ids: string[]
          match_count?: number
          query_embedding: string
        }
        Returns: {
          book_id: string
          content: string
          id: string
          kind: string
          lesson_id: string
          page_number: number
          similarity: number
          unit_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "student"
      book_type: "textbook" | "workbook"
      progress_status: "not_started" | "in_progress" | "completed"
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
      app_role: ["admin", "student"],
      book_type: ["textbook", "workbook"],
      progress_status: ["not_started", "in_progress", "completed"],
    },
  },
} as const
