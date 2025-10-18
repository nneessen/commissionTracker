#!/bin/bash
# Fix WSL2 networking and apply migration

echo "========================================="
echo "   WSL2 Network Fix & Migration"
echo "========================================="
echo ""

# Step 1: Fix DNS
echo "Step 1: Fixing DNS configuration..."
if grep -q "generateResolvConf" /etc/wsl.conf 2>/dev/null; then
    echo "  DNS config already set"
else
    echo "  Updating WSL DNS config..."
    echo "[network]" | sudo tee -a /etc/wsl.conf > /dev/null
    echo "generateResolvConf = true" | sudo tee -a /etc/wsl.conf > /dev/null
fi

# Step 2: Restart networking via Windows
echo ""
echo "Step 2: Restarting WSL networking..."
/mnt/c/Windows/System32/cmd.exe /c "wsl.exe --shutdown" 2>/dev/null || true
sleep 2

# Step 3: This script will be killed by wsl --shutdown, so we need a different approach
# Create a persistent script that Windows can run
cat > /tmp/apply_after_restart.sh << 'INNER_SCRIPT'
#!/bin/bash
cd /home/nneessen/projects/commissionTracker

echo "Applying migration after WSL restart..."

export PGPASSWORD='N123j234n345!$!$'
psql \
  "host=aws-1-us-east-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.pcyaqwodnyrpkaiojnpz sslmode=require" \
  -f supabase/migrations/20251018_003_enhance_commission_chargeback_trigger.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    rm /tmp/apply_after_restart.sh
    exit 0
else
    echo "❌ Migration failed"
    # Try Node.js method
    node scripts/run-migration-direct.cjs
    exit $?
fi
INNER_SCRIPT

chmod +x /tmp/apply_after_restart.sh

echo ""
echo "========================================="
echo "Restart detected. Re-running migration..."
echo "=========================================echo ""

# Just run the migration - don't restart WSL
cd /home/nneessen/projects/commissionTracker

export PGPASSWORD='N123j234n345!$!$'

# Try with sslmode=require
psql \
  "host=aws-1-us-east-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.pcyaqwodnyrpkaiojnpz sslmode=require" \
  -f supabase/migrations/20251018_003_enhance_commission_chargeback_trigger.sql 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    exit 0
fi

echo ""
echo "Direct psql failed. Trying alternative methods..."

# Try with different SSL modes
for SSLMODE in "prefer" "allow" "disable"; do
    echo ""
    echo "Trying with sslmode=$SSLMODE..."
    psql \
      "host=aws-1-us-east-2.pooler.supabase.com port=6543 dbname=postgres user=postgres.pcyaqwodnyrpkaiojnpz sslmode=$SSLMODE" \
      -f supabase/migrations/20251018_003_enhance_commission_chargeback_trigger.sql 2>&1

    if [ $? -eq 0 ]; then
        echo "✅ Migration applied successfully with sslmode=$SSLMODE!"
        exit 0
    fi
done

echo ""
echo "All attempts failed. Your WSL2 networking is blocking PostgreSQL connections."
echo "To fix this, run these commands in Windows PowerShell (as Administrator):"
echo ""
echo "  wsl --shutdown"
echo "  netsh int ip reset"
echo "  netsh winsock reset"
echo "  # Then restart your computer"
echo ""

exit 1
