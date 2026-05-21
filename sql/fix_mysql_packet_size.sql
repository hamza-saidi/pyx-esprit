-- Fix MySQL packet size for large imports
-- Run this script to increase the max_allowed_packet setting

-- Check current setting
SHOW VARIABLES LIKE 'max_allowed_packet';

-- Set max_allowed_packet to 64MB (adjust as needed)
SET GLOBAL max_allowed_packet = 67108864; -- 64MB in bytes

-- For permanent changes, add to my.cnf or my.ini:
-- [mysqld]
-- max_allowed_packet = 64M

-- Verify the change
SHOW VARIABLES LIKE 'max_allowed_packet';

-- Alternative: Set session-level packet size (for current connection only)
-- SET SESSION max_allowed_packet = 67108864;

-- Check other relevant settings
SHOW VARIABLES LIKE 'net_buffer_length';
SHOW VARIABLES LIKE 'net_read_timeout';
SHOW VARIABLES LIKE 'net_write_timeout';

-- Increase timeouts for large operations
SET GLOBAL net_read_timeout = 600;  -- 10 minutes
SET GLOBAL net_write_timeout = 600; -- 10 minutes

-- For InnoDB settings (if using InnoDB)
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW VARIABLES LIKE 'innodb_log_file_size';

-- Recommended InnoDB settings for large imports:
-- innodb_buffer_pool_size = 1G (or 50% of available RAM)
-- innodb_log_file_size = 256M


