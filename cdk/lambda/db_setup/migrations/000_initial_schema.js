/**
 * Initial database schema – translated from lambda/initializer/initializer.py
 *
 * This migration is the baseline for the AILA database. It creates all core
 * tables, foreign-key constraints, and the unique enrolment constraint.
 *
 * node-pg-migrate will track this in the "pgmigrations" table.
 */

exports.up = async (pgm) => {
  // ── Extensions ────────────────────────────────────────────────────────
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  // ── Tables ────────────────────────────────────────────────────────────

  pgm.createTable("Users", {
    user_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    user_email: { type: "varchar", unique: true },
    username: { type: "varchar" },
    first_name: { type: "varchar" },
    last_name: { type: "varchar" },
    preferred_name: { type: "varchar" },
    time_account_created: { type: "timestamp" },
    roles: { type: "varchar[]" },
    last_sign_in: { type: "timestamp" },
  });

  pgm.createTable("Courses", {
    course_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    course_name: { type: "varchar" },
    course_department: { type: "varchar" },
    course_number: { type: "integer" },
    course_access_code: { type: "varchar" },
    course_student_access: { type: "bool" },
    system_prompt: { type: "text" },
  });

  pgm.createTable("Course_Concepts", {
    concept_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    course_id: { type: "uuid" },
    concept_name: { type: "varchar" },
    concept_number: { type: "integer" },
  });

  pgm.createTable("Course_Modules", {
    module_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    concept_id: { type: "uuid" },
    module_name: { type: "varchar" },
    module_number: { type: "integer" },
  });

  pgm.createTable("Enrolments", {
    enrolment_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    user_id: { type: "uuid" },
    course_id: { type: "uuid" },
    enrolment_type: { type: "varchar" },
    course_completion_percentage: { type: "integer" },
    time_spent: { type: "integer" },
    time_enroled: { type: "timestamp" },
  });

  pgm.createTable("Module_Files", {
    file_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    module_id: { type: "uuid" },
    filetype: { type: "varchar" },
    s3_bucket_reference: { type: "varchar" },
    filepath: { type: "varchar" },
    filename: { type: "varchar" },
    time_uploaded: { type: "timestamp" },
    metadata: { type: "text" },
  });

  pgm.createTable("Student_Modules", {
    student_module_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    course_module_id: { type: "uuid" },
    enrolment_id: { type: "uuid" },
    module_score: { type: "integer" },
    last_accessed: { type: "timestamp" },
    module_context_embedding: { type: "float[]" },
  });

  pgm.createTable("Sessions", {
    session_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    student_module_id: { type: "uuid" },
    session_name: { type: "varchar" },
    session_context_embeddings: { type: "float[]" },
    last_accessed: { type: "timestamp" },
  });

  pgm.createTable("Messages", {
    message_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    session_id: { type: "uuid" },
    student_sent: { type: "bool" },
    message_content: { type: "varchar" },
    time_sent: { type: "timestamp" },
  });

  pgm.createTable("User_Engagement_Log", {
    log_id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    user_id: { type: "uuid" },
    course_id: { type: "uuid" },
    module_id: { type: "uuid" },
    enrolment_id: { type: "uuid" },
    timestamp: { type: "timestamp" },
    engagement_type: { type: "varchar" },
    engagement_details: { type: "text" },
  });

  pgm.createTable("chatlogs_notifications", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    course_id: { type: "uuid", notNull: true },
    instructor_email: { type: "varchar", notNull: true },
    request_id: { type: "uuid", notNull: true },
    completion: { type: "boolean", default: false },
  });

  // ── Foreign Keys ──────────────────────────────────────────────────────

  // Course_Concepts -> Courses
  pgm.addConstraint("Course_Concepts", "Course_Concepts_course_id_fkey", {
    foreignKeys: {
      columns: "course_id",
      references: '"Courses"(course_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  // Course_Modules -> Course_Concepts
  pgm.addConstraint("Course_Modules", "Course_Modules_concept_id_fkey", {
    foreignKeys: {
      columns: "concept_id",
      references: '"Course_Concepts"(concept_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  // Enrolments -> Courses
  pgm.addConstraint("Enrolments", "Enrolments_course_id_fkey", {
    foreignKeys: {
      columns: "course_id",
      references: '"Courses"(course_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  // Enrolments -> Users
  pgm.addConstraint("Enrolments", "Enrolments_user_id_fkey", {
    foreignKeys: {
      columns: "user_id",
      references: '"Users"(user_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  // Module_Files -> Course_Modules
  pgm.addConstraint("Module_Files", "Module_Files_module_id_fkey", {
    foreignKeys: {
      columns: "module_id",
      references: '"Course_Modules"(module_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  // Student_Modules -> Course_Modules
  pgm.addConstraint(
    "Student_Modules",
    "Student_Modules_course_module_id_fkey",
    {
      foreignKeys: {
        columns: "course_module_id",
        references: '"Course_Modules"(module_id)',
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
  );

  // Student_Modules -> Enrolments
  pgm.addConstraint("Student_Modules", "Student_Modules_enrolment_id_fkey", {
    foreignKeys: {
      columns: "enrolment_id",
      references: '"Enrolments"(enrolment_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  // Sessions -> Student_Modules
  pgm.addConstraint("Sessions", "Sessions_student_module_id_fkey", {
    foreignKeys: {
      columns: "student_module_id",
      references: '"Student_Modules"(student_module_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  // Messages -> Sessions
  pgm.addConstraint("Messages", "Messages_session_id_fkey", {
    foreignKeys: {
      columns: "session_id",
      references: '"Sessions"(session_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  // User_Engagement_Log foreign keys
  pgm.addConstraint(
    "User_Engagement_Log",
    "User_Engagement_Log_enrolment_id_fkey",
    {
      foreignKeys: {
        columns: "enrolment_id",
        references: '"Enrolments"(enrolment_id)',
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
  );

  pgm.addConstraint("User_Engagement_Log", "User_Engagement_Log_user_id_fkey", {
    foreignKeys: {
      columns: "user_id",
      references: '"Users"(user_id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  });

  pgm.addConstraint(
    "User_Engagement_Log",
    "User_Engagement_Log_course_id_fkey",
    {
      foreignKeys: {
        columns: "course_id",
        references: '"Courses"(course_id)',
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
  );

  pgm.addConstraint(
    "User_Engagement_Log",
    "User_Engagement_Log_module_id_fkey",
    {
      foreignKeys: {
        columns: "module_id",
        references: '"Course_Modules"(module_id)',
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
  );

  // chatlogs_notifications foreign keys
  pgm.addConstraint(
    "chatlogs_notifications",
    "chatlogs_notifications_course_id_fkey",
    {
      foreignKeys: {
        columns: "course_id",
        references: '"Courses"(course_id)',
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
  );

  pgm.addConstraint(
    "chatlogs_notifications",
    "chatlogs_notifications_instructor_email_fkey",
    {
      foreignKeys: {
        columns: "instructor_email",
        references: '"Users"(user_email)',
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
  );

  // ── Unique Constraints ────────────────────────────────────────────────

  pgm.addConstraint("Enrolments", "unique_course_user", {
    unique: ["course_id", "user_id"],
  });
};

exports.down = async (pgm) => {
  // Drop in reverse dependency order
  pgm.dropTable("chatlogs_notifications", { cascade: true });
  pgm.dropTable("User_Engagement_Log", { cascade: true });
  pgm.dropTable("Messages", { cascade: true });
  pgm.dropTable("Sessions", { cascade: true });
  pgm.dropTable("Student_Modules", { cascade: true });
  pgm.dropTable("Module_Files", { cascade: true });
  pgm.dropTable("Enrolments", { cascade: true });
  pgm.dropTable("Course_Modules", { cascade: true });
  pgm.dropTable("Course_Concepts", { cascade: true });
  pgm.dropTable("Courses", { cascade: true });
  pgm.dropTable("Users", { cascade: true });
  pgm.sql('DROP EXTENSION IF EXISTS "uuid-ossp";');
};
