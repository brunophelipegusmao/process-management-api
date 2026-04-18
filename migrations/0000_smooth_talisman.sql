CREATE TYPE "public"."action_type" AS ENUM('CREATE_PROCESS', 'UPDATE_PROCESS', 'DELETE_PROCESS', 'CREATE_HEARING', 'UPDATE_HEARING', 'CANCEL_HEARING', 'RESCHEDULE_HEARING', 'CREATE_WITNESS', 'UPDATE_WITNESS', 'REPLACE_WITNESS', 'RETIRE_WITNESS', 'CREATE_DEADLINE', 'UPDATE_DEADLINE', 'CANCEL_DEADLINE', 'SEND_EMAIL', 'ACK_EMAIL', 'FULFILL_EMAIL', 'CREATE_USER', 'UPDATE_USER', 'JOB_PRAZOS');--> statement-breakpoint
CREATE TYPE "public"."client_side" AS ENUM('reu', 'autor');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('pf', 'pj');--> statement-breakpoint
CREATE TYPE "public"."court_type" AS ENUM('vara', 'jec');--> statement-breakpoint
CREATE TYPE "public"."deadline_status" AS ENUM('aberto', 'cumprido', 'vencido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."deadline_type" AS ENUM('dados_testemunha', 'custas_precatoria', 'juntada_intimacao', 'desistencia_testemunha', 'providencia_cliente');--> statement-breakpoint
CREATE TYPE "public"."email_template" AS ENUM('E1', 'E2', 'E3', 'E4', 'E5', 'E6');--> statement-breakpoint
CREATE TYPE "public"."hearing_status" AS ENUM('agendada', 'realizada', 'cancelada', 'redesignada');--> statement-breakpoint
CREATE TYPE "public"."hearing_type" AS ENUM('conciliacao', 'aij', 'oitiva', 'acij');--> statement-breakpoint
CREATE TYPE "public"."holiday_source" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TYPE "public"."holiday_type" AS ENUM('nacional', 'estadual', 'municipal');--> statement-breakpoint
CREATE TYPE "public"."process_status" AS ENUM('citado', 'em_andamento', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."user_profile" AS ENUM('superadmin', 'advogado', 'paralegal');--> statement-breakpoint
CREATE TYPE "public"."witness_side" AS ENUM('reu', 'autor');--> statement-breakpoint
CREATE TYPE "public"."witness_status" AS ENUM('pendente_dados', 'dados_completos', 'rol_juntado', 'intimada', 'intimacao_positiva', 'intimacao_negativa', 'aguardando_cliente', 'desistida', 'substituida');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"action_type" "action_type" NOT NULL,
	"description" text NOT NULL,
	"previous_data" jsonb,
	"new_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"type" "client_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"witness_id" uuid,
	"type" "deadline_type" NOT NULL,
	"due_date" date NOT NULL,
	"status" "deadline_status" DEFAULT 'aberto' NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"template" "email_template" NOT NULL,
	"recipient" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"replied_at" timestamp,
	"acknowledgment_date" date,
	"fulfilled_at" date
);
--> statement-breakpoint
CREATE TABLE "hearings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"date_time" timestamp NOT NULL,
	"type" "hearing_type" NOT NULL,
	"status" "hearing_status" DEFAULT 'agendada' NOT NULL,
	"rescheduled_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"type" "holiday_type" NOT NULL,
	"state" text,
	"municipality" text,
	"source" "holiday_source" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"cnj_number" text NOT NULL,
	"comarca" text NOT NULL,
	"vara" text NOT NULL,
	"court_type" "court_type" NOT NULL,
	"author_name" text NOT NULL,
	"defendant_name" text NOT NULL,
	"client_side" "client_side" DEFAULT 'reu' NOT NULL,
	"status" "process_status" DEFAULT 'citado' NOT NULL,
	"citation_date" date,
	"mentions_witness" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processes_cnj_number_unique" UNIQUE("cnj_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"profile" "user_profile" DEFAULT 'advogado' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "witnesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" uuid NOT NULL,
	"replaced_by_id" uuid,
	"full_name" text NOT NULL,
	"address" text NOT NULL,
	"residence_comarca" text NOT NULL,
	"marital_status" text,
	"profession" text,
	"phone" text,
	"notes" text,
	"side" "witness_side" DEFAULT 'reu' NOT NULL,
	"status" "witness_status" DEFAULT 'pendente_dados' NOT NULL,
	"replaced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_witness_id_witnesses_id_fk" FOREIGN KEY ("witness_id") REFERENCES "public"."witnesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "witnesses" ADD CONSTRAINT "witnesses_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "witnesses" ADD CONSTRAINT "witnesses_replaced_by_id_witnesses_id_fk" FOREIGN KEY ("replaced_by_id") REFERENCES "public"."witnesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_single_superadmin_idx" ON "users" USING btree ("profile") WHERE "users"."profile" = 'superadmin';