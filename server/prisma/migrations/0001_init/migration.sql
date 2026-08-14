-- CreateTable
CREATE TABLE `provinces` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `shortName` VARCHAR(10) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `province_id` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `pinyin` VARCHAR(100) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hospitals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `province_id` INTEGER NOT NULL,
    `city_id` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `level` VARCHAR(50) NOT NULL,
    `address` VARCHAR(500) NULL,
    `map_lng` DOUBLE NULL,
    `map_lat` DOUBLE NULL,
    `intro` TEXT NULL,
    `logo` VARCHAR(500) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `hospitals_province_id_idx`(`province_id`),
    INDEX `hospitals_city_id_idx`(`city_id`),
    INDEX `hospitals_is_published_idx`(`is_published`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clinic_services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hospital_id` INTEGER NOT NULL,
    `clinic_type` VARCHAR(50) NOT NULL,
    `intro` VARCHAR(500) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `clinic_services_hospital_id_idx`(`hospital_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clinic_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinic_service_id` INTEGER NOT NULL,
    `day_of_week` INTEGER NOT NULL,
    `has_morning` BOOLEAN NOT NULL DEFAULT false,
    `has_afternoon` BOOLEAN NOT NULL DEFAULT false,
    `has_evening` BOOLEAN NOT NULL DEFAULT false,
    `remark` VARCHAR(200) NULL,

    UNIQUE INDEX `clinic_schedules_clinic_service_id_day_of_week_key`(`clinic_service_id`, `day_of_week`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `phone_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinic_service_id` INTEGER NOT NULL,
    `phone_name` VARCHAR(50) NOT NULL,
    `phone_number` VARCHAR(50) NOT NULL,
    `contact_person` VARCHAR(50) NULL,
    `remark` VARCHAR(200) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `phone_contacts_clinic_service_id_idx`(`clinic_service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `doctors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hospital_id` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `avatar` VARCHAR(500) NULL,
    `title` VARCHAR(50) NOT NULL,
    `intro` TEXT NULL,
    `specialty` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `doctors_hospital_id_idx`(`hospital_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hospital_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hospital_id` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role` VARCHAR(20) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_provinces` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `province_id` INTEGER NOT NULL,

    UNIQUE INDEX `user_provinces_user_id_province_id_key`(`user_id`, `province_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dict_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `dict_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dict_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dict_type_id` INTEGER NOT NULL,
    `label` VARCHAR(50) NOT NULL,
    `value` VARCHAR(50) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cities` ADD CONSTRAINT `cities_province_id_fkey` FOREIGN KEY (`province_id`) REFERENCES `provinces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hospitals` ADD CONSTRAINT `hospitals_province_id_fkey` FOREIGN KEY (`province_id`) REFERENCES `provinces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hospitals` ADD CONSTRAINT `hospitals_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hospitals` ADD CONSTRAINT `hospitals_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clinic_services` ADD CONSTRAINT `clinic_services_hospital_id_fkey` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clinic_schedules` ADD CONSTRAINT `clinic_schedules_clinic_service_id_fkey` FOREIGN KEY (`clinic_service_id`) REFERENCES `clinic_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `phone_contacts` ADD CONSTRAINT `phone_contacts_clinic_service_id_fkey` FOREIGN KEY (`clinic_service_id`) REFERENCES `clinic_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `doctors` ADD CONSTRAINT `doctors_hospital_id_fkey` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hospital_images` ADD CONSTRAINT `hospital_images_hospital_id_fkey` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_provinces` ADD CONSTRAINT `user_provinces_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_provinces` ADD CONSTRAINT `user_provinces_province_id_fkey` FOREIGN KEY (`province_id`) REFERENCES `provinces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dict_items` ADD CONSTRAINT `dict_items_dict_type_id_fkey` FOREIGN KEY (`dict_type_id`) REFERENCES `dict_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

