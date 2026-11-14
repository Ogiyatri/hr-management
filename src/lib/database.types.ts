export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applicants: {
        Row: {
          applied_at: string
          cv_path: string | null
          email: string
          full_name: string
          hired_employee_id: string | null
          id: string
          job_posting_id: string
          notes: string | null
          phone: string | null
          rating: number | null
          stage: Database["public"]["Enums"]["applicant_stage"]
          updated_at: string
        }
        Insert: {
          applied_at?: string
          cv_path?: string | null
          email: string
          full_name: string
          hired_employee_id?: string | null
          id?: string
          job_posting_id: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          stage?: Database["public"]["Enums"]["applicant_stage"]
          updated_at?: string
        }
        Update: {
          applied_at?: string
          cv_path?: string | null
          email?: string
          full_name?: string
          hired_employee_id?: string | null
          id?: string
          job_posting_id?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          stage?: Database["public"]["Enums"]["applicant_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_hired_employee_id_fkey"
            columns: ["hired_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      attendances: {
        Row: {
          branch_id: string
          check_in_accuracy_m: number | null
          check_in_at: string | null
          check_in_distance_m: number | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_path: string | null
          check_out_at: string | null
          check_out_distance_m: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_path: string | null
          created_at: string
          employee_id: string
          id: string
          late_minutes: number
          note: string | null
          overtime_minutes: number
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          work_date: string
        }
        Insert: {
          branch_id: string
          check_in_accuracy_m?: number | null
          check_in_at?: string | null
          check_in_distance_m?: number | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_path?: string | null
          check_out_at?: string | null
          check_out_distance_m?: number | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_path?: string | null
          created_at?: string
          employee_id: string
          id?: string
          late_minutes?: number
          note?: string | null
          overtime_minutes?: number
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date: string
        }
        Update: {
          branch_id?: string
          check_in_accuracy_m?: number | null
          check_in_at?: string | null
          check_in_distance_m?: number | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_path?: string | null
          check_out_at?: string | null
          check_out_distance_m?: number | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_path?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          late_minutes?: number
          note?: string | null
          overtime_minutes?: number
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          radius_m: number
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          radius_m?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          radius_m?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_salary_components: {
        Row: {
          amount: number
          component_id: string
          created_at: string
          employee_id: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          component_id: string
          created_at?: string
          employee_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          component_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_components_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          base_salary: number | null
          birth_date: string | null
          bpjs_kesehatan_no: string | null
          bpjs_ketenagakerjaan_no: string | null
          branch_id: string
          created_at: string
          department_id: string | null
          email: string
          employee_no: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          end_date: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          join_date: string
          nik: string | null
          npwp: string | null
          phone: string | null
          photo_path: string | null
          position_id: string | null
          ptkp_status: string
          shift_id: string | null
          status: Database["public"]["Enums"]["employee_status"]
          supervisor_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number | null
          birth_date?: string | null
          bpjs_kesehatan_no?: string | null
          bpjs_ketenagakerjaan_no?: string | null
          branch_id: string
          created_at?: string
          department_id?: string | null
          email: string
          employee_no: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          end_date?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          join_date?: string
          nik?: string | null
          npwp?: string | null
          phone?: string | null
          photo_path?: string | null
          position_id?: string | null
          ptkp_status?: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          supervisor_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number | null
          birth_date?: string | null
          bpjs_kesehatan_no?: string | null
          bpjs_ketenagakerjaan_no?: string | null
          branch_id?: string
          created_at?: string
          department_id?: string | null
          email?: string
          employee_no?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          end_date?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          join_date?: string
          nik?: string | null
          npwp?: string | null
          phone?: string | null
          photo_path?: string | null
          position_id?: string | null
          ptkp_status?: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          supervisor_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          branch_id: string | null
          created_at: string
          date: string
          id: string
          name: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          date: string
          id?: string
          name: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          date?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          branch_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          opened_at: string | null
          position_id: string | null
          quota: number
          requirements: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          opened_at?: string | null
          position_id?: string | null
          quota?: number
          requirements?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          opened_at?: string | null
          position_id?: string | null
          quota?: number
          requirements?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          employee_id: string
          leave_type_id: string
          quota: number
          used: number
          year: number
        }
        Insert: {
          employee_id: string
          leave_type_id: string
          quota: number
          used?: number
          year: number
        }
        Update: {
          employee_id?: string
          leave_type_id?: string
          quota?: number
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          attachment_path: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          hr_decided_at: string | null
          hr_id: string | null
          hr_note: string | null
          id: string
          leave_type_id: string
          reason: string
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at: string | null
          supervisor_id: string | null
          supervisor_note: string | null
          updated_at: string
        }
        Insert: {
          attachment_path?: string | null
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          hr_decided_at?: string | null
          hr_id?: string | null
          hr_note?: string | null
          id?: string
          leave_type_id: string
          reason: string
          start_date: string
          status?: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at?: string | null
          supervisor_id?: string | null
          supervisor_note?: string | null
          updated_at?: string
        }
        Update: {
          attachment_path?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          hr_decided_at?: string | null
          hr_id?: string | null
          hr_note?: string | null
          id?: string
          leave_type_id?: string
          reason?: string
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at?: string | null
          supervisor_id?: string | null
          supervisor_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_hr_id_fkey"
            columns: ["hr_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          created_at: string
          default_quota: number | null
          id: string
          is_paid: boolean
          name: string
          requires_attachment: boolean
        }
        Insert: {
          code: string
          created_at?: string
          default_quota?: number | null
          id?: string
          is_paid?: boolean
          name: string
          requires_attachment?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          default_quota?: number | null
          id?: string
          is_paid?: boolean
          name?: string
          requires_attachment?: boolean
        }
        Relationships: []
      }
      overtime_requests: {
        Row: {
          created_at: string
          employee_id: string
          hours: number
          hr_decided_at: string | null
          hr_id: string | null
          id: string
          note: string | null
          reason: string
          status: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at: string | null
          supervisor_id: string | null
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          hours: number
          hr_decided_at?: string | null
          hr_id?: string | null
          id?: string
          note?: string | null
          reason: string
          status?: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at?: string | null
          supervisor_id?: string | null
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          hours?: number
          hr_decided_at?: string | null
          hr_id?: string | null
          id?: string
          note?: string | null
          reason?: string
          status?: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at?: string | null
          supervisor_id?: string | null
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_hr_id_fkey"
            columns: ["hr_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          amount: number
          component_id: string
          created_at: string
          employee_id: string
          id: string
          note: string | null
          period_id: string
        }
        Insert: {
          amount: number
          component_id: string
          created_at?: string
          employee_id: string
          id?: string
          note?: string | null
          period_id: string
        }
        Update: {
          amount?: number
          component_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          note?: string | null
          period_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          end_date: string
          finalized_at: string | null
          id: string
          paid_at: string | null
          period_month: string
          start_date: string
          status: Database["public"]["Enums"]["payroll_status"]
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          finalized_at?: string | null
          id?: string
          paid_at?: string | null
          period_month: string
          start_date: string
          status?: Database["public"]["Enums"]["payroll_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          finalized_at?: string | null
          id?: string
          paid_at?: string | null
          period_month?: string
          start_date?: string
          status?: Database["public"]["Enums"]["payroll_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      payslip_items: {
        Row: {
          amount: number
          code: string
          id: string
          is_company_contribution: boolean
          name: string
          payslip_id: string
          sort_order: number
          type: Database["public"]["Enums"]["component_type"]
        }
        Insert: {
          amount: number
          code: string
          id?: string
          is_company_contribution?: boolean
          name: string
          payslip_id: string
          sort_order?: number
          type: Database["public"]["Enums"]["component_type"]
        }
        Update: {
          amount?: number
          code?: string
          id?: string
          is_company_contribution?: boolean
          name?: string
          payslip_id?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["component_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payslip_items_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          absent_days: number
          base_salary: number
          bpjs_company: number
          bpjs_employee: number
          branch_id: string
          created_at: string
          employee_id: string
          gross_taxable: number
          id: string
          late_minutes: number
          leave_days: number
          net_salary: number
          overtime_hours: number
          period_id: string
          position_name: string | null
          pph21: number
          present_days: number
          ptkp_status: string
          ter_category: string
          total_deductions: number
          total_earnings: number
          updated_at: string
          working_days: number
        }
        Insert: {
          absent_days?: number
          base_salary?: number
          bpjs_company?: number
          bpjs_employee?: number
          branch_id: string
          created_at?: string
          employee_id: string
          gross_taxable?: number
          id?: string
          late_minutes?: number
          leave_days?: number
          net_salary?: number
          overtime_hours?: number
          period_id: string
          position_name?: string | null
          pph21?: number
          present_days?: number
          ptkp_status: string
          ter_category: string
          total_deductions?: number
          total_earnings?: number
          updated_at?: string
          working_days?: number
        }
        Update: {
          absent_days?: number
          base_salary?: number
          bpjs_company?: number
          bpjs_employee?: number
          branch_id?: string
          created_at?: string
          employee_id?: string
          gross_taxable?: number
          id?: string
          late_minutes?: number
          leave_days?: number
          net_salary?: number
          overtime_hours?: number
          period_id?: string
          position_name?: string | null
          pph21?: number
          present_days?: number
          ptkp_status?: string
          ter_category?: string
          total_deductions?: number
          total_earnings?: number
          updated_at?: string
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          base_salary: number
          created_at: string
          department_id: string | null
          id: string
          level: number
          name: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          created_at?: string
          department_id?: string | null
          id?: string
          level?: number
          name: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          created_at?: string
          department_id?: string | null
          id?: string
          level?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      pph21_ter_rates: {
        Row: {
          category: string
          max_income: number | null
          min_income: number
          rate: number
        }
        Insert: {
          category: string
          max_income?: number | null
          min_income: number
          rate: number
        }
        Update: {
          category?: string
          max_income?: number | null
          min_income?: number
          rate?: number
        }
        Relationships: []
      }
      salary_components: {
        Row: {
          code: string
          created_at: string
          id: string
          is_fixed: boolean
          is_taxable: boolean
          name: string
          type: Database["public"]["Enums"]["component_type"]
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_fixed?: boolean
          is_taxable?: boolean
          name: string
          type: Database["public"]["Enums"]["component_type"]
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_fixed?: boolean
          is_taxable?: boolean
          name?: string
          type?: Database["public"]["Enums"]["component_type"]
        }
        Relationships: []
      }
      shifts: {
        Row: {
          branch_id: string | null
          created_at: string
          end_time: string
          id: string
          late_tolerance_minutes: number
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          late_tolerance_minutes?: number
          name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          late_tolerance_minutes?: number
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attendance_recap: {
        Args: { p_branch_id?: string; p_end: string; p_start: string }
        Returns: {
          absent: number
          branch_name: string
          department_name: string
          employee_id: string
          employee_no: string
          full_name: string
          late: number
          late_minutes: number
          leave: number
          overtime_minutes: number
          present: number
          sick: number
          working_days: number
        }[]
      }
      can_view_employee: { Args: { p_employee_id: string }; Returns: boolean }
      cancel_leave: {
        Args: { p_request_id: string }
        Returns: {
          attachment_path: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          hr_decided_at: string | null
          hr_id: string | null
          hr_note: string | null
          id: string
          leave_type_id: string
          reason: string
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at: string | null
          supervisor_id: string | null
          supervisor_note: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_overtime: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          employee_id: string
          hours: number
          hr_decided_at: string | null
          hr_id: string | null
          id: string
          note: string | null
          reason: string
          status: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at: string | null
          supervisor_id: string | null
          updated_at: string
          work_date: string
        }
        SetofOptions: {
          from: "*"
          to: "overtime_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clock_in: {
        Args: {
          p_accuracy_m?: number
          p_lat: number
          p_lng: number
          p_photo_path: string
        }
        Returns: {
          branch_id: string
          check_in_accuracy_m: number | null
          check_in_at: string | null
          check_in_distance_m: number | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_path: string | null
          check_out_at: string | null
          check_out_distance_m: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_path: string | null
          created_at: string
          employee_id: string
          id: string
          late_minutes: number
          note: string | null
          overtime_minutes: number
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          work_date: string
        }
        SetofOptions: {
          from: "*"
          to: "attendances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clock_out: {
        Args: { p_lat: number; p_lng: number; p_photo_path: string }
        Returns: {
          branch_id: string
          check_in_accuracy_m: number | null
          check_in_at: string | null
          check_in_distance_m: number | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_path: string | null
          check_out_at: string | null
          check_out_distance_m: number | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_path: string | null
          created_at: string
          employee_id: string
          id: string
          late_minutes: number
          note: string | null
          overtime_minutes: number
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          work_date: string
        }
        SetofOptions: {
          from: "*"
          to: "attendances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_employee_id: { Args: never; Returns: string }
      dashboard_summary: { Args: { p_branch_id?: string }; Returns: Json }
      decide_leave: {
        Args: { p_approve: boolean; p_note?: string; p_request_id: string }
        Returns: {
          attachment_path: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          hr_decided_at: string | null
          hr_id: string | null
          hr_note: string | null
          id: string
          leave_type_id: string
          reason: string
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at: string | null
          supervisor_id: string | null
          supervisor_note: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "leave_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_overtime: {
        Args: { p_approve: boolean; p_note?: string; p_request_id: string }
        Returns: {
          created_at: string
          employee_id: string
          hours: number
          hr_decided_at: string | null
          hr_id: string | null
          id: string
          note: string | null
          reason: string
          status: Database["public"]["Enums"]["request_status"]
          supervisor_decided_at: string | null
          supervisor_id: string | null
          updated_at: string
          work_date: string
        }
        SetofOptions: {
          from: "*"
          to: "overtime_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      employee_branch: { Args: { p_employee_id: string }; Returns: string }
      generate_payroll: { Args: { p_period_id: string }; Returns: number }
      haversine_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_hr: { Args: { p_branch_id?: string }; Returns: boolean }
      is_supervisor_of: { Args: { p_employee_id: string }; Returns: boolean }
      pph17_annual: { Args: { p_pkp: number }; Returns: number }
      ptkp_amount: { Args: { p_ptkp: string }; Returns: number }
      set_payroll_status: {
        Args: {
          p_period_id: string
          p_status: Database["public"]["Enums"]["payroll_status"]
        }
        Returns: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          end_date: string
          finalized_at: string | null
          id: string
          paid_at: string | null
          period_month: string
          start_date: string
          status: Database["public"]["Enums"]["payroll_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payroll_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      setting: { Args: { p_key: string }; Returns: number }
      ter_category: { Args: { p_ptkp: string }; Returns: string }
      ter_rate: {
        Args: { p_category: string; p_gross: number }
        Returns: number
      }
      working_days: {
        Args: { p_branch_id: string; p_end: string; p_start: string }
        Returns: string[]
      }
    }
    Enums: {
      app_role: "admin" | "hr" | "manager" | "employee"
      applicant_stage:
        | "applied"
        | "screening"
        | "interview"
        | "offering"
        | "hired"
        | "rejected"
      attendance_status:
        | "present"
        | "late"
        | "absent"
        | "leave"
        | "sick"
        | "holiday"
      component_type: "earning" | "deduction"
      employee_status: "active" | "resigned" | "terminated"
      employment_type: "permanent" | "contract" | "probation" | "intern"
      gender: "male" | "female"
      job_status: "draft" | "open" | "closed"
      payroll_status: "draft" | "finalized" | "paid"
      request_status:
        | "pending"
        | "approved_supervisor"
        | "approved"
        | "rejected"
        | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "hr", "manager", "employee"],
      applicant_stage: [
        "applied",
        "screening",
        "interview",
        "offering",
        "hired",
        "rejected",
      ],
      attendance_status: [
        "present",
        "late",
        "absent",
        "leave",
        "sick",
        "holiday",
      ],
      component_type: ["earning", "deduction"],
      employee_status: ["active", "resigned", "terminated"],
      employment_type: ["permanent", "contract", "probation", "intern"],
      gender: ["male", "female"],
      job_status: ["draft", "open", "closed"],
      payroll_status: ["draft", "finalized", "paid"],
      request_status: [
        "pending",
        "approved_supervisor",
        "approved",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const

