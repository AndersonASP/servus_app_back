import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class FlutterWebMiddleware implements NestMiddleware {
  private readonly flutterWebPath = join(process.cwd(), '../servus_app/build/web');

  use(req: Request, res: Response, next: NextFunction) {
    // Verificar se é uma requisição para arquivos estáticos do Flutter Web
    if (this.isFlutterWebAsset(req.path)) {
      const filePath = join(this.flutterWebPath, req.path);
      
      if (existsSync(filePath)) {
        // Servir arquivo estático
        return res.sendFile(filePath);
      }
    }
    
    next();
  }

  private isFlutterWebAsset(path: string): boolean {
    // Lista de extensões e caminhos que devem ser servidos como arquivos estáticos
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json'];
    const staticPaths = ['/flutter_bootstrap.js', '/flutter_web_config.js', '/main.dart.js', '/flutter.js', '/canvaskit/', '/icons/', '/assets/'];
    
    // Verificar extensões
    if (staticExtensions.some(ext => path.endsWith(ext))) {
      return true;
    }
    
    // Verificar caminhos específicos
    if (staticPaths.some(staticPath => path.startsWith(staticPath))) {
      return true;
    }
    
    return false;
  }
}
