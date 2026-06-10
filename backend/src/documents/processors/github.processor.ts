import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class GithubProcessor {
  private readonly SUPPORTED_EXTENSIONS = ['.md', '.ts', '.js', '.py', '.txt', '.json'];

  // Generated/lock files that are large and contain no useful documentation
  private readonly BLOCKED_FILENAMES = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'composer.lock',
    'Gemfile.lock',
    'Cargo.lock',
    'poetry.lock',
    'bun.lockb',
  ]);

  private readonly MAX_FILE_SIZE_BYTES = 100_000; // 100 KB

  async extractFromRepo(repoUrl: string): Promise<Array<{ path: string; content: string }>> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-repo-'));

    try {
      execSync(`git clone --depth=1 ${repoUrl} ${tmpDir}`, { stdio: 'pipe' });
      return this.readFiles(tmpDir, tmpDir);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private readFiles(dir: string, root: string): Array<{ path: string; content: string }> {
    const results: Array<{ path: string; content: string }> = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
      if (this.BLOCKED_FILENAMES.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.readFiles(fullPath, root));
      } else if (this.SUPPORTED_EXTENSIONS.includes(path.extname(entry.name))) {
        const stat = fs.statSync(fullPath);
        if (stat.size > this.MAX_FILE_SIZE_BYTES) continue;

        results.push({
          path: path.relative(root, fullPath),
          content: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    }

    return results;
  }
}
