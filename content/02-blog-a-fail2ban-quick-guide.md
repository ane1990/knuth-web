| template | blog-post |
| title | Is the door now closed? |
| description | A short guide and a cheatsheet about the usage of fail2ban on Linux |
| keywords | blog, updates, linux, system-administrations, hackers, attacker, forever, ban |
| summary | A short guide and a cheatsheet about the usage of fail2ban on Linux  |

## Today, 2025-08-23

A bit tired to see in this server a lot of `ssh` tentatives to access using user/password (but unfortunately for them password access is not possible on knuth :-) or checking in the nginx `access.log` a plenty of http protocol maliciuos handshake injections i decided to investigate a bit and finally installed fail2ban and configured it. 
Basically with a dictatorial policy ONE ATTEMP = FOREVER BAN.

---

Here i publish a guide with some usefull commands used to setup or check the status in the future of this server maintenance:

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
(created a specific filter, since i treat on the nginx everything i consider garbage to respond with `444`, adapted some lines into the .conf, per nano commands below)

```bash
nano /etc/fail2ban/filter.d/nginx-attacker.conf
```

## 3. Create jail.override file
```bash
nano /etc/fail2ban/jail.local
```
Inside it, add or **replace**:
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
