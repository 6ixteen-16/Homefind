# Homefind - Microsoft OneDrive Database Backup & Recovery Guide

This guide is designed to work on **any Windows computer** where the Homefind project is cloned or installed. It does not rely on hardcoded drive letters, user account names, or specific MySQL version paths.

---

## Why This Setup is Portable to Any PC

* **Automatic User Discovery**: Uses `%USERPROFILE%\OneDrive`, which Windows automatically maps to the logged-in user's OneDrive on any PC.
* **Automatic Project Location**: Uses `%CD%` (current directory) and relative paths (`.\`), so it works regardless of whether the project is on `C:`, `D:`, or `B:`.
* **Automatic MySQL Detection**: The backup engine searches system `PATH`, as well as standard installation directories (`C:\Program Files\MySQL`, `C:\Program Files (x86)\MySQL`, XAMPP, and Laragon) across MySQL 8.0, 8.4, 9.x, and 26.x.
* **Decoupled Credentials**: Reads `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, and `DB_NAME` dynamically from the local `.env` file on that machine.

---

## 1. Prerequisites on the Target PC

1. **Microsoft OneDrive** is installed and signed in.
   * Ensure `C:\Users\<YourUsername>\OneDrive` exists.
2. **MySQL Server** is installed and running.
3. **Configure your `.env` file** in the project root:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=homefind_app
   DB_PASS=your_local_db_password
   DB_NAME=homefinder_db
   ```

---

## 2. Complete Walkthrough: From Backup Creation to Pulling & Restoring (Using CMD)

Open **Command Prompt (CMD)** and navigate to your project folder:
```cmd
cd /d C:\path\to\Homefind
```
*(Replace `C:\path\to\Homefind` with your actual project location).*

---

### Part A: Create the Backup

#### Step 1: Run the Backup Command
From inside your project folder, run:
```cmd
backup_to_onedrive.bat
```

* **Where the file is created on that machine:**
  ```text
  %USERPROFILE%\OneDrive\Homefind_Backups\homefinder_db_latest.sql
  ```
  *(Example: `C:\Users\<Username>\OneDrive\Homefind_Backups\homefinder_db_latest.sql`)*
* **What happens:** The database is dumped into this file, and Windows OneDrive uploads it to the Microsoft cloud in the background.

---

### Part B: Pull the Backup File to Your Working Project Folder

#### Step 2: Copy the File from OneDrive
In CMD, run:
```cmd
copy "%USERPROFILE%\OneDrive\Homefind_Backups\homefinder_db_latest.sql" .\restored_backup.sql
```

* **Where the file is located now:**
  ```text
  .\restored_backup.sql (directly inside your project folder)
  ```
* **Output:** `1 file(s) copied.`

---

### Part C: Restore into a New Database

Choose **Option 1** (MySQL Command-Line Client) or **Option 2** (MySQL Workbench).

---

#### Option 1: For MySQL Command-Line Client Users

1. **Step 3: Open the MySQL Client**
   If `mysql` is in your system PATH:
   ```cmd
   mysql -h 127.0.0.1 -u homefind_app -p
   ```
   *(If `mysql` is not recognized, specify your MySQL path, e.g.: `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h 127.0.0.1 -u homefind_app -p`)*

   Type your database password when prompted and press **Enter**. You are now in:
   ```text
   mysql>
   ```

2. **Step 4: Create a New Empty Database**
   ```sql
   CREATE DATABASE homefinder_restore;
   ```

3. **Step 5: Select the New Database**
   ```sql
   USE homefinder_restore;
   ```

4. **Step 6: Load the Backup File (Using `SOURCE`)**
   ```sql
   SOURCE restored_backup.sql;
   ```
   *(If your MySQL client was opened from another folder, supply the full path with forward slashes `/`, e.g. `SOURCE C:/path/to/Homefind/restored_backup.sql;`)*

5. **Step 7: Verify the Restored Data**
   ```sql
   SHOW TABLES;
   SELECT COUNT(*) AS total_properties FROM property;
   ```

6. **Step 8: Exit MySQL**
   ```sql
   EXIT;
   ```

---

#### Option 2: For MySQL Workbench Users

1. **Step 3: Launch MySQL Workbench**
   Open MySQL Workbench and connect to your local MySQL server.

2. **Step 4: Create the New Database**
   In a new query tab, execute:
   ```sql
   CREATE DATABASE homefinder_restore;
   ```
   Click the **Execute (⚡ Lightning Bolt)** icon.

3. **Step 5: Open the Backup File**
   In the top menu, go to **File** &rarr; **Open SQL Script...** and select:
   ```text
   restored_backup.sql (from your project directory)
   ```

4. **Step 6: Set Target Database**
   Add this line at the very top of the script editor:
   ```sql
   USE homefinder_restore;
   ```

5. **Step 7: Execute the Script**
   Click the **Execute (⚡ Lightning Bolt)** icon.

6. **Step 8: Verify the Restored Data**
   In the left panel under **Navigator &rarr; Schemas**, right-click anywhere and click **Refresh All**. Expand **`homefinder_restore`** &rarr; **Tables** to see all tables populated.

---

## 3. Initial Setup: Schedule Automatic Daily Backups on This PC

To make backups run automatically every day at **02:00 AM** on this computer:

1. Open **Command Prompt (CMD) as Administrator**.
2. Navigate to your project folder:
   ```cmd
   cd /d C:\path\to\Homefind
   ```
3. Run:
   ```cmd
   schtasks /create /tn "Homefind_OneDrive_Backup" /tr "%CD%\backup_to_onedrive.bat" /sc daily /st 02:00 /f
   ```

> **Why `%CD%` matters:**
> `%CD%` resolves to whatever directory you are currently in. It binds the task directly to the current location on that specific machine.

---

## 4. Daily Task Management Commands (Run from Any PC)

### Trigger an Instant Backup
```cmd
schtasks /run /tn "Homefind_OneDrive_Backup"
```
*(Or double-click `backup_to_onedrive.bat` in File Explorer).*

### Check Task Health and Next Run Time
```cmd
schtasks /query /tn "Homefind_OneDrive_Backup" /fo table
```

### View All Existing Backups in OneDrive
```cmd
dir "%USERPROFILE%\OneDrive\Homefind_Backups"
```

### Pause the Scheduled Task
```cmd
schtasks /change /tn "Homefind_OneDrive_Backup" /disable
```

### Resume the Scheduled Task
```cmd
schtasks /change /tn "Homefind_OneDrive_Backup" /enable
```

### Permanently Remove the Scheduled Task
```cmd
schtasks /delete /tn "Homefind_OneDrive_Backup" /f
```

---

## 5. Troubleshooting on Different PCs

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| `mysqldump: command not found` | MySQL is installed in a non-standard custom directory | Add your MySQL `bin` folder to the Windows System PATH environment variable. |
| `Access is denied` during `schtasks` | CMD was not opened as Administrator | Right-click CMD in the Start Menu and select **Run as Administrator**. |
| Files not syncing to cloud | OneDrive is not signed in | Click the OneDrive cloud icon in the bottom-right taskbar tray and sign in to Microsoft OneDrive. |
| `Access denied for user 'homefind_app'@'127.0.0.1'` | Incorrect credentials in `.env` | Update the `DB_USER` and `DB_PASS` values in your `.env` file to match that machine's MySQL credentials. |
