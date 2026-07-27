// ressources.multer-options.spec.ts
import { BadRequestException } from '@nestjs/common';
import { ressourceFileFilter } from './ressources.multer-options';

describe('ressourceFileFilter', () => {
  const makeFile = (originalname: string): Express.Multer.File =>
    ({ originalname }) as Express.Multer.File;

  it('accepte un fichier .pdf', () => {
    const callback = jest.fn();
    ressourceFileFilter(null, makeFile('cours.pdf'), callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('accepte un fichier .zip', () => {
    const callback = jest.fn();
    ressourceFileFilter(null, makeFile('archive.zip'), callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('accepte peu importe la casse de l’extension', () => {
    const callback = jest.fn();
    ressourceFileFilter(null, makeFile('COURS.PDF'), callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('refuse un exécutable', () => {
    const callback = jest.fn();
    ressourceFileFilter(null, makeFile('virus.exe'), callback);
    expect(callback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
  });

  it('refuse un fichier sans extension reconnue', () => {
    const callback = jest.fn();
    ressourceFileFilter(null, makeFile('image.png'), callback);
    expect(callback).toHaveBeenCalledWith(
      expect.any(BadRequestException),
      false,
    );
  });
});
