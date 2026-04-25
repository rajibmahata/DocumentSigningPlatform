using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocumentSigning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMerchantReminderSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ReminderEnabled",
                table: "Merchants",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ReminderWindowHours",
                table: "Merchants",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReminderEnabled",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "ReminderWindowHours",
                table: "Merchants");
        }
    }
}
