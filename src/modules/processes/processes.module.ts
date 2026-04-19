import { Module } from '@nestjs/common';

import { ClientsModule } from '../clients/clients.module';
import { ProcessesController } from './processes.controller';
import { ProcessesRepository } from './processes.repository';
import { ProcessesService } from './processes.service';

@Module({
  imports: [ClientsModule],
  controllers: [ProcessesController],
  providers: [ProcessesRepository, ProcessesService],
  exports: [ProcessesRepository, ProcessesService],
})
export class ProcessesModule {}
