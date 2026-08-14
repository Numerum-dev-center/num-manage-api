import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

function createHost(): {
  host: ArgumentsHost;
  json: jest.Mock<void, [ErrorBody]>;
  status: jest.Mock;
} {
  const json = jest.fn<void, [ErrorBody]>();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('aplatit le message d’une HttpException construite avec une simple chaîne (pas de double-emballage)', () => {
    const { host, json } = createHost();
    filter.catch(
      new ForbiddenException("Vous n'encadrez pas cette promotion"),
      host,
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: "Vous n'encadrez pas cette promotion",
        error: 'Forbidden',
      }),
    );
    const body: ErrorBody = json.mock.calls[0][0];
    expect(typeof body.message).toBe('string');
  });

  it('conserve le tableau de messages d’une erreur de validation (ValidationPipe)', () => {
    const { host, json } = createHost();
    filter.catch(new BadRequestException(['promotionId must be a UUID']), host);
    const body: ErrorBody = json.mock.calls[0][0];
    expect(Array.isArray(body.message)).toBe(true);
    expect(body.message).toEqual(['promotionId must be a UUID']);
  });

  it('retombe sur un message générique pour une exception non-HttpException, sans planter', () => {
    const { host, json } = createHost();
    filter.catch(new Error('boom interne'), host);
    const body: ErrorBody = json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Erreur interne du serveur');
  });
});
