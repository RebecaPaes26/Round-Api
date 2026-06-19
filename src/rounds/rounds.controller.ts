import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RoundsService } from './rounds.service';

@Controller()
export class RoundsController {
  constructor(private readonly rounds: RoundsService) {}

  @Get('health')
  health() {
    return this.rounds.health();
  }

  @Get('bootstrap')
  bootstrap() {
    return this.rounds.bootstrap();
  }

  @Get('patients')
  listPatients() {
    return this.rounds.listPatients();
  }

  @Post('patients')
  savePatient(@Body() body: Record<string, unknown>) {
    return this.rounds.savePatient(body);
  }

  @Patch('patients/:id/archive')
  archivePatient(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.rounds.archivePatient(id, body);
  }

  @Post('rounds/start')
  startRound(@Body() body: Record<string, unknown>) {
    return this.rounds.startRound(body);
  }

  @Get('dashboard')
  dashboard(@Query() query: Record<string, string>) {
    return this.rounds.dashboard(query);
  }

  @Get('history')
  history(@Query() query: Record<string, string>) {
    return this.rounds.history(query);
  }

  @Get('daily-report')
  dailyReport(@Query() query: Record<string, string>) {
    return this.rounds.dailyReport(query);
  }
}
