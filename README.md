# Knuth Website

This repository contains the website files for the Knuth project.

## Deployment

This project uses GitHub Actions for automated deployment. When you push commits to the `main` branch, the website will be automatically deployed to the server.

### Prerequisites

Before the automated deployment can work, you need to set up the following:

1. **SSH Key Setup**:
   - Generate an SSH key pair if you don't have one:
     ```bash
     ssh-keygen -t rsa -b 4096 -f mykey-knuth
     ```
   - Add the **public key** (`mykey-knuth.pub`) to the server's `~/.ssh/authorized_keys`
   - Add the **private key** (`mykey-knuth`) to GitHub Secrets

2. **GitHub Secrets Configuration**:
   - Go to your repository settings
   - Navigate to "Secrets and variables" → "Actions"
   - Add a new repository secret:
     - **Name**: `SSH_PRIVATE_KEY`
     - **Value**: The entire content of your private key file (`mykey-knuth`)

### Manual Deployment

If you need to deploy manually, you can use the following command:

```bash
scp -i mykey-knuth -P 22 -r dist/* alberto@knuth-it.duckdns.org:/var/www/html/content/
```

### Server Configuration

The deployment target is:
- **Server**: `knuth-it.duckdns.org`
- **User**: `alberto`
- **Port**: `22`
- **Destination**: `/var/www/html/content/`

### File Structure

The repository contains:
- `content/` - Markdown sources. Each `<name>.md` becomes `dist/<name>.html`.
- `templates/` - HTML templates. Use `{{content}}` in templates to place rendered Markdown. `sudoku_solver.html` uses `{{sudoku_initial}}`.
- `css/styles.css` - Shared CSS styles
- `js/scripts.js` - Shared JavaScript functionality
- `js/sudoku.js` - Sudoku logic (separate from content)
- `build.js` - Static site generator
- `package.json` - Build dependencies and scripts
- `.github/workflows/deploy.yml` - GitHub Actions deployment workflow
- `.gitignore` - Git ignore rules for web projects

### Development

To work on this project locally:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install --no-audit --no-fund
   ```
3. Edit or add Markdown in `content/` (e.g. `content/index.md`)
4. At the very first row, declare the template using a simple table:
   ```
   | template | index |
   ```
   Available templates: `index`, `knuth`, `sudoku_solver` (add more by creating `.html` files in `templates/`).
5. For the Sudoku page, put either a JSON object of fixed cells or a 9-line grid after the template row. Example JSON:
   ```
   | template | sudoku_solver |

   { "0,0": 5, "1,2": 7 }
   ```
6. Build the site:
   ```bash
   npm run build
   ```
7. Open files from `dist/` in a browser to test locally
8. Commit and push to the `main` branch to trigger deployment

### Code Organization

The project follows a modular structure for better maintainability:
- **CSS**: All styles are centralized in `css/styles.css`
- **JavaScript**: All interactive functionality is in `js/scripts.js`
- **HTML**: Pages are generated from Markdown using templates in `templates/`
- **Benefits**: Easier maintenance, better caching, and cleaner code structure

### Troubleshooting

If deployment fails:

1. Check the GitHub Actions logs for error messages
2. Verify that the SSH key is correctly added to GitHub Secrets
3. Ensure the public key is properly installed on the server
4. Confirm the server is accessible and the destination directory exists

### Security Notes

- Never commit private keys to the repository
- The `.gitignore` file excludes sensitive files
- SSH keys are stored securely in GitHub Secrets
- The deployment workflow cleans up SSH keys after use 