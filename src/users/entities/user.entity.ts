import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nom!: string;

  @Column()
  prenom!: string;

  @Column({ unique: true })
  email!: string;

   @Column({ nullable: true })
password!: string;

  @Column({ nullable: true })
  telephone!: string;

  @Column({ default: 'APPRENANT' })
  role!: string;

  @Column({ default: true })
  estActif!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
  @UpdateDateColumn()
updatedAt!: Date;
}