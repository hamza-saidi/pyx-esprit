# Fix MySQL Settings for Large Imports

## Problem
You're getting this error when importing large files:
```
code: 'ER_NET_PACKET_TOO_LARGE',
errno: 1153,
sqlMessage: "Got a packet bigger than 'max_allowed_packet' bytes"
```

## Solution

### Option 1: Temporary Fix (Current Session Only)

Run this SQL command in your MySQL client:

```sql
SET GLOBAL max_allowed_packet = 67108864; -- 64MB
SET GLOBAL net_read_timeout = 600;        -- 10 minutes
SET GLOBAL net_write_timeout = 600;       -- 10 minutes
```

### Option 2: Permanent Fix (Recommended)

#### For MySQL 8.0+ (my.ini on Windows)

1. Find your MySQL configuration file:
   - Usually in `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`
   - Or `C:\Program Files\MySQL\MySQL Server 8.0\my.ini`

2. Add these lines under the `[mysqld]` section:
```ini
[mysqld]
max_allowed_packet = 64M
net_read_timeout = 600
net_write_timeout = 600
innodb_buffer_pool_size = 1G
```

3. Restart MySQL service:
```cmd
net stop mysql80
net start mysql80
```

#### For MySQL 5.7 (my.cnf on Linux/Mac)

1. Find your MySQL configuration file:
   - Usually in `/etc/mysql/my.cnf` or `/etc/my.cnf`

2. Add these lines under the `[mysqld]` section:
```ini
[mysqld]
max_allowed_packet = 64M
net_read_timeout = 600
net_write_timeout = 600
innodb_buffer_pool_size = 1G
```

3. Restart MySQL service:
```bash
sudo systemctl restart mysql
```

### Option 3: Using the SQL Script

Run the provided SQL script:
```bash
mysql -u your_username -p your_database < sql/fix_mysql_packet_size.sql
```

## Verify the Changes

After making changes, verify they took effect:

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
SHOW VARIABLES LIKE 'net_read_timeout';
SHOW VARIABLES LIKE 'net_write_timeout';
```

You should see:
- `max_allowed_packet`: 67108864 (64MB)
- `net_read_timeout`: 600
- `net_write_timeout`: 600

## What These Settings Do

- **max_allowed_packet**: Maximum size of data packets MySQL can handle
- **net_read_timeout**: How long MySQL waits for data from client
- **net_write_timeout**: How long MySQL waits to send data to client
- **innodb_buffer_pool_size**: Memory allocated for InnoDB operations

## Alternative: Use Smaller Batches

If you can't change MySQL settings, the system now automatically uses smaller batch sizes:
- 1,000 contacts or less: 100 per batch
- 1,000-10,000 contacts: 50 per batch  
- 10,000-50,000 contacts: 25 per batch
- 50,000+ contacts: 10 per batch

This should work even with default MySQL settings.

## Troubleshooting

### Still Getting Errors?

1. **Check current settings**:
```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
```

2. **Try smaller packet size**:
```sql
SET GLOBAL max_allowed_packet = 33554432; -- 32MB
```

3. **Check MySQL error log** for more details

### For Very Large Imports (50,000+ contacts)

Consider:
1. Increasing `max_allowed_packet` to 128M or 256M
2. Using the smallest batch size (10 contacts per batch)
3. Running imports during off-peak hours
4. Monitoring server memory usage

## Success!

After applying these settings, your large imports should work without the packet size error. The system will process your 16,499 contacts in manageable batches with progress tracking.


