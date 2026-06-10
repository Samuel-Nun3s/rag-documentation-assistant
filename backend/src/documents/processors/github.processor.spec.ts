import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { GithubProcessor } from './github.processor';

jest.mock('child_process');
jest.mock('fs');

describe('GithubProcessor', () => {
  let processor: GithubProcessor;

  const mockTmpDir = '/tmp/rag-repo-test123';

  beforeEach(() => {
    processor = new GithubProcessor();
    jest.clearAllMocks();

    jest.spyOn(fs, 'mkdtempSync').mockReturnValue(mockTmpDir);
    jest.spyOn(fs, 'rmSync').mockImplementation(() => undefined);
    jest.spyOn(childProcess, 'execSync').mockImplementation(() => Buffer.from(''));
  });

  it('clones the repo and returns files with supported extensions', async () => {
    jest.spyOn(fs, 'readdirSync').mockReturnValue([
      { name: 'README.md', isDirectory: () => false } as any,
      { name: 'index.ts', isDirectory: () => false } as any,
      { name: 'image.png', isDirectory: () => false } as any, // unsupported — should be skipped
    ]);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('file content');

    const result = await processor.extractFromRepo('https://github.com/org/repo');

    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('git clone'),
      expect.anything(),
    );
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.path)).toEqual(
      expect.arrayContaining(['README.md', 'index.ts']),
    );
  });

  it('skips hidden directories and node_modules', async () => {
    jest.spyOn(fs, 'readdirSync').mockReturnValue([
      { name: '.git', isDirectory: () => true } as any,
      { name: 'node_modules', isDirectory: () => true } as any,
      { name: 'src', isDirectory: () => true } as any,
    ]);

    // src dir with one file
    jest.spyOn(fs, 'readdirSync')
      .mockReturnValueOnce([
        { name: '.git', isDirectory: () => true } as any,
        { name: 'node_modules', isDirectory: () => true } as any,
        { name: 'src', isDirectory: () => true } as any,
      ])
      .mockReturnValueOnce([
        { name: 'app.ts', isDirectory: () => false } as any,
      ]);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('content');

    const result = await processor.extractFromRepo('https://github.com/org/repo');

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('src/app.ts');
  });

  it('always cleans up the temp directory even on error', async () => {
    jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
      throw new Error('read error');
    });

    await expect(
      processor.extractFromRepo('https://github.com/org/repo'),
    ).rejects.toThrow('read error');

    expect(fs.rmSync).toHaveBeenCalledWith(mockTmpDir, { recursive: true, force: true });
  });
});
