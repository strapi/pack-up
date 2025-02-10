import fs from 'fs/promises';
import path from 'path';

import { loadPkg, validatePkg } from '../pkg';

const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('pkg', () => {
  const tmpfolder = path.resolve(__dirname, '.tmp');

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadPkg', () => {
    beforeEach(async () => {
      await fs.mkdir(tmpfolder);
      await fs.copyFile(
        path.resolve(__dirname, 'fixtures', 'test.pkg.json'),
        path.resolve(tmpfolder, 'package.json')
      );
    });

    afterEach(async () => {
      await fs.rm(tmpfolder, { recursive: true });
    });

    it('should succesfully load the package.json closest to the cwd provided & call the debug logger', async () => {
      // @ts-expect-error - Logger is mocked
      const pkg = await loadPkg({ cwd: tmpfolder, logger: loggerMock });

      expect(pkg).toMatchInlineSnapshot(`
        {
          "name": "testing",
          "version": "0.0.0",
        }
      `);

      expect(loggerMock.debug).toHaveBeenCalled();
    });

    it('should throw an error if it cannot find a package.json', async () => {
      await expect(
        // @ts-expect-error - Logger is mocked
        loadPkg({ cwd: '/', logger: loggerMock })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"Could not find a package.json in the current directory"'
      );
    });
  });

  describe('validatePkg', () => {
    it("should return the validated package.json if it's valid", async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
      };

      const validatedPkg = await validatePkg({
        pkg,
        // @ts-expect-error logger is mocked
        logger: loggerMock,
      });

      expect(validatedPkg).toMatchInlineSnapshot(`
        {
          "name": "testing",
          "version": "0.0.0",
        }
      `);
    });

    it('should fail if a required field is missing and call the error logger with the correct message', async () => {
      expect(() =>
        validatePkg({
          pkg: {
            version: '0.0.0',
          },
          // @ts-expect-error logger is mocked
          logger: loggerMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        "\"'name' in 'package.json' is required as type '[35mstring[39m'\""
      );

      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
          },
          // @ts-expect-error logger is mocked
          logger: loggerMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        "\"'version' in 'package.json' is required as type '[35mstring[39m'\""
      );
    });

    it('should fail if a required field does not match the correct type and call the error logger with the correct message', async () => {
      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
            version: 0,
          },
          // @ts-expect-error logger is mocked
          logger: loggerMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        "\"'version' in 'package.json' must be of type '[35mstring[39m' (recieved '[35mnumber[39m')\""
      );
    });

    it("should warn if the regex for a field doesn't match and call the warning logger with the correct message", async () => {
      await expect(
        validatePkg({
          pkg: {
            name: 'testing',
            version: '0.0.0',
            exports: {
              apple: './apple.xyzx',
            },
          },
          // @ts-expect-error logger is mocked
          logger: loggerMock,
        })
      ).resolves.toBeTruthy();

      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Warning: Value "./apple.xyzx" does not match the required regex /^\\.\\/.*\\.json$/'
      );

      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
            version: '0.0.0',
            type: 'something',
          },
          // @ts-expect-error logger is mocked
          logger: loggerMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"type must be one of the following values: commonjs, module"'
      );
    });

    it('should fail if the exports object does not match expectations', async () => {
      expect(() =>
        validatePkg({
          pkg: {
            name: 'testing',
            version: '0.0.0',
            exports: 'hello',
          },
          // @ts-expect-error logger is mocked
          logger: loggerMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        "\"'exports' in 'package.json' must be of type '[35mobject[39m' (recieved '[35mstring[39m')\""
      );
    });

    it('should pass validation for valid exports with allowed keys', async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './feature': {
            source: './src/feature.js',
            default: './dist/feature.js',
          },
        },
      };

      const validatedPkg = await validatePkg({
        pkg,
        // @ts-expect-error logger is mocked
        logger: loggerMock,
      });

      expect(validatedPkg.exports).toEqual(pkg.exports);
    });

    it('should warn but not fail for unknown keys in exports', async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './feature': {
            source: './src/feature.js',
            default: './dist/feature.js',
            unknownKey: 'value',
          },
        },
      };

      const validatedPkg = await validatePkg({
        pkg,
        // @ts-expect-error logger is mocked
        logger: loggerMock,
      });

      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Unknown keys in exports: unknownKey')
      );

      expect(validatedPkg.exports).toEqual(pkg.exports);
    });

    it('should fail if required fields in exports are missing', async () => {
      await expect(
        validatePkg({
          pkg: {
            name: 'testing',
            version: '0.0.0',
            exports: {
              './feature': {
                default: './dist/feature.js',
              },
            },
          },
          // @ts-expect-error logger is mocked
          logger: loggerMock,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"The schema does not contain the path: exports["./feature"].source. (failed at: .exports which is a type: "object")"'
      );
    });

    it('should pass if optional fields in exports are omitted', async () => {
      const pkg = {
        name: 'testing',
        version: '0.0.0',
        exports: {
          './feature': {
            source: './src/feature.js',
            default: './dist/feature.js',
          },
        },
      };

      const validatedPkg = await validatePkg({
        pkg,
        // @ts-expect-error logger is mocked
        logger: loggerMock,
      });

      expect(validatedPkg.exports).toEqual(pkg.exports);
    });
  });
});
