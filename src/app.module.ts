import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './common/guards/auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { HearingsModule } from './modules/hearings/hearings.module';
import { JobsModule } from './jobs/jobs.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DeadlinesModule } from './modules/deadlines/deadlines.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WitnessesModule } from './modules/witnesses/witnesses.module';
import { UsersModule } from './modules/users/users.module';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule,
    UsersModule,
    ProcessesModule,
    DeadlinesModule,
    WitnessesModule,
    HearingsModule,
    JobsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
