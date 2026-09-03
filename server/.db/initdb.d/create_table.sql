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

-- 월 단위로 확정된 스케줄 (인원 x 월 별 한 행, 재확정 시 덮어씀)
CREATE TABLE IF NOT EXISTS `monthly_schedules` (
  `monthly_schedule_id` CHAR(36) NOT NULL,
  `agent_information_id` CHAR(36) NOT NULL,
  `schedule_month` CHAR(7) NOT NULL,                       -- 'YYYY-MM'
  `leave_dates` VARCHAR(500) NOT NULL DEFAULT '',          -- 콤마 구분 'YYYY-MM-DD' (확정된 전체 휴무)
  `annual_leave_dates` VARCHAR(500) NOT NULL DEFAULT '',   -- 콤마 구분 'YYYY-MM-DD' (해당 월 연차일)
  `annual_leave_count` INT NOT NULL DEFAULT 0,             -- 해당 월 사용 연차 수
  `confirmed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`monthly_schedule_id`),
  UNIQUE KEY `uq_agent_month` (`agent_information_id`, `schedule_month`)
);

INSERT INTO number_of_visitors (total_count, today_count) VALUES (0, 0);
