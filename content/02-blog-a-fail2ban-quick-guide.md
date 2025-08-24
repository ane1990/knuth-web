| template | blog-post |
| title | Is the door now closed? |
| description | A comprehensive guide and cheatsheet about the usage of fail2ban on Linux systems. Learn how to protect your server from malicious attacks with permanent bans. |
| keywords | blog, updates, linux, system-administration, hackers, attacker, forever, ban, fail2ban, security, server protection, ssh, nginx |
| summary | A short guide and a cheatsheet about the usage of fail2ban on Linux |
| publish_date | 2025-08-23 |
| current_url | 02-blog-a-fail2ban-quick-guide.html |
| meta_description | A comprehensive guide and cheatsheet about the usage of fail2ban on Linux systems. Learn how to protect your server from malicious attacks with permanent bans. |
| meta_keywords | blog, updates, linux, system-administration, hackers, attacker, forever, ban, fail2ban, security, server protection, ssh, nginx, cybersecurity |

## Today, 2025-08-23

After noticing numerous SSH login attempts using username/password combinations (fortunately password access is disabled on this server) and observing malicious HTTP protocol handshake injections in the nginx `access.log`, I decided to investigate and ultimately installed and configured fail2ban. 

With a strict policy: ONE ATTEMPT = PERMANENT BAN.

---

Here I present a guide with useful commands for setting up and checking the status of fail2ban during future server maintenance:

```markdown
# Fail2ban Cheat-sheet  
(only commands executed in your installation logs)

## 1. Install
```bash
apt-get install fail2ban
```

## 2. Build & Activate the Nginx 444 jail
```bash
cp /etc/fail2ban/filter.d/nginx-badrequest.conf /etc/fail2ban/filter.d/nginx-attacker.conf
```
# Created a specific filter since we treat all garbage requests in nginx with a `444` response
# The nginx-badrequest.conf is a native fail2ban filter that detects various types of malicious requests
# including malformed HTTP requests, SQL injection attempts, and other suspicious patterns

```bash
nano /etc/fail2ban/filter.d/nginx-attacker.conf
```

## 3. Create jail.override file
```bash
nano /etc/fail2ban/jail.local
```
# Inside it, add or **replace**:
```ini
[nginx-attacker]
backend = auto
enabled  = true
port     = http,https
filter   = nginx-attacker
logpath  = /var/log/nginx/access.log
findtime = 10
maxretry = 0
bantime  = -1
```
# Configuration explanation:
# - backend = auto: Automatically detect the backend system
# - enabled = true: Enable this jail
# - port = http,https: Monitor both HTTP and HTTPS traffic
# - filter = nginx-attacker: Use our custom filter
# - logpath = /var/log/nginx/access.log: Path to nginx access logs
# - findtime = 10: Time window in seconds to look for violations
# - maxretry = 0: No retries allowed - immediate ban on first offense
# - bantime = -1: Permanent ban (-1 means infinite)

# Why enable the native nginx-badrequest filter?
# It's better to use the native filter because it's regularly updated with new patterns
# and covers a wide range of malicious requests including:
# - SQL injection attempts
# - Path traversal attacks
# - Malformed HTTP requests
# - Suspicious user agents
# - Common exploit patterns
#
# For example, in our server logs we found requests like:
# 205.210.31.226 - - [24/Aug/2025:09:14:28 +0000] "\x16\x03\x01\x00\xCA\x01\x00\x00\xC6\x03\x036\xE5$\xF5\xA5\x1F\x86\x9E/\xF2\xEA\x92\xD1\xF7\xEA}Clo\xC9{w\x85\xDE3if\xA7\xBD\xF4'\x22\x00\x00h\xCC\x14\xCC\x13\xC0/\xC0+\xC00\xC0,\xC0\x11\xC0\x07\xC0'\xC0#\xC0\x13\xC0\x09\xC0(\xC0$\xC0\x14\xC0" 400 166 "-" "-"
# These are SSL/TLS handshake attempts on non-SSL ports, which are clearly malicious
# The nginx-badrequest filter can detect and block these automatically

*(example of the nginx attacker configuration)*

## 4. Reload and verify
```bash
fail2ban-client reload nginx-attacker
fail2ban-client status nginx-attacker
fail2ban-client get nginx-attacker bantime
```

## 5. Replace runtime ban-time for sshd (permanent)
```bash
echo -e "[sshd]\nbantime = -1" | tee /etc/fail2ban/jail.d/sshd-permanent.conf
fail2ban-client reload sshd
```
*(verify bantime then as for point 3)*

## 6. Check & Unban IPs
```bash
tail -F /var/log/fail2ban.log          # live log
fail2ban-client set <jail> unbanip <IP>
fail2ban-client set nginx-attacker unbanip 93.xx.yyy.xx
fail2ban-client set sshd unbanip <IP>
```

## 7. Quick test matchers
```bash
fail2ban-regex /var/log/nginx/access.log /etc/fail2ban/filter.d/nginx-attacker.conf
```
