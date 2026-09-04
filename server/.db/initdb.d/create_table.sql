CREATE DATABASE IF NOT EXISTS dev_portfolio;

USE dev_portfolio;

CREATE TABLE IF NOT EXISTS `number_of_visitors` (
  `visitor_id` int NOT NULL AUTO_INCREMENT,
  `total_count` int NOT NULL DEFAULT '0',
  `today_count` int DEFAULT '0',
  `today_date` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`visitor_id`)
);

CREATE TABLE IF NOT EXISTS `visitor_comments` (
  `visitor_comment_id` int NOT NULL AUTO_INCREMENT,
  `nickname` varchar(20) NOT NULL,
  `password` varchar(60) NOT NULL,
  `description` varchar(255) NOT NULL,
  `create_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`visitor_comment_id`)
);

CREATE TABLE IF NOT EXISTS `agent_informations` (
  `agent_information_id` CHAR(36) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `name` varchar(20) NOT NULL,
  `job_level` varchar(20) NOT NULL,
  `description` varchar(255) NOT NULL,
  `annualleave` varchar(255) NOT NULL,
  PRIMARY KEY (`agent_information_id`)
);

-- 확정된 휴일/연차 이력: 하루 = 한 행 (인원 x 날짜)
CREATE TABLE IF NOT EXISTS `monthly_leaves` (
  `monthly_leave_id` CHAR(36) NOT NULL,
  `agent_information_id` CHAR(36) NOT NULL,
  `schedule_month` CHAR(7) NOT NULL,                       -- 'YYYY-MM' (leave_date 가 속한 달)
  `leave_date` DATE NOT NULL,                              -- 'YYYY-MM-DD'
  `leave_type` ENUM('leave', 'annual') NOT NULL DEFAULT 'leave',
  `confirmed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`monthly_leave_id`),
  UNIQUE KEY `uq_agent_date` (`agent_information_id`, `leave_date`),
  KEY `idx_schedule_month` (`schedule_month`)
);

-- 앱 전역 설정 (키-값). 값은 JSON 문자열로 저장. 예) subjob1, subjob2, essentialWork
CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
);

INSERT INTO number_of_visitors (total_count, today_count) VALUES (0, 0);
