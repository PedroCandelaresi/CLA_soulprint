import {MigrationInterface, QueryRunner} from "typeorm";

export class AlignPromotionBadgeFk1776187383381 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query("ALTER TABLE `promotion` DROP FOREIGN KEY `FK_b0aa1e1a3e4bade7c4e822daecc`", undefined);
        await queryRunner.query("ALTER TABLE `promotion` ADD CONSTRAINT `FK_b0aa1e1a3e4bade7c4e822daecc` FOREIGN KEY (`customFieldsBadgeid`) REFERENCES `badge`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query("ALTER TABLE `promotion` DROP FOREIGN KEY `FK_b0aa1e1a3e4bade7c4e822daecc`", undefined);
        await queryRunner.query("ALTER TABLE `promotion` ADD CONSTRAINT `FK_b0aa1e1a3e4bade7c4e822daecc` FOREIGN KEY (`customFieldsBadgeid`) REFERENCES `badge`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION", undefined);
   }

}
