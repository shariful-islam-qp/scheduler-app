import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaskStatus } from '../enums/task-status.enum';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('text')
  message: string;

  @Column({ type: 'timestamptz' })
  executeAt: Date;

  @Column({ default: TaskStatus.PENDING })
  status: TaskStatus;

  @CreateDateColumn()
  createdAt: Date;
}
