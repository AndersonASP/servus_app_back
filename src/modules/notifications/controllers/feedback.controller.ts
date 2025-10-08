import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FeedbackService } from '../services/feedback.service';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @ApiOperation({
    summary: 'Obter feedbacks do usuário',
    description:
      'Retorna os feedbacks do usuário logado, com opção de filtrar por tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de feedbacks do usuário',
  })
  async getUserFeedbacks(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub;
    const limitNumber = limit ? parseInt(limit, 10) : 50;

    return this.feedbackService.getUserFeedbacks(userId, tenantId, limitNumber);
  }

  @Post(':feedbackId/read')
  @ApiOperation({
    summary: 'Marcar feedback como lido',
    description: 'Marca um feedback específico como lido pelo usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback marcado como lido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Feedback não encontrado',
  })
  async markAsRead(@Param('feedbackId') feedbackId: string, @Req() req: any) {
    const userId = req.user.sub;
    const success = await this.feedbackService.markAsRead(feedbackId, userId);

    return {
      success,
      message: success
        ? 'Feedback marcado como lido'
        : 'Feedback não encontrado',
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obter estatísticas de feedback',
    description: 'Retorna estatísticas dos feedbacks do usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de feedback',
  })
  async getFeedbackStats(@Req() req: any) {
    const userId = req.user.sub;
    const feedbacks = await this.feedbackService.getUserFeedbacks(userId);

    const stats = {
      total: feedbacks.length,
      unread: feedbacks.filter((f) => !f.readAt).length,
      byType: {
        success: feedbacks.filter((f) => f.type === 'success').length,
        error: feedbacks.filter((f) => f.type === 'error').length,
        warning: feedbacks.filter((f) => f.type === 'warning').length,
        info: feedbacks.filter((f) => f.type === 'info').length,
      },
      recent: feedbacks.slice(0, 5), // Últimos 5 feedbacks
    };

    return stats;
  }
}
