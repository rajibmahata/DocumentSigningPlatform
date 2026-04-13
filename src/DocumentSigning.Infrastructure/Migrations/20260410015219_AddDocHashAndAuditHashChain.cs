using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocumentSigning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDocHashAndAuditHashChain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Hash",
                table: "SignedDocuments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Hash",
                table: "AuditLogs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Hash",
                table: "SignedDocuments");

            migrationBuilder.DropColumn(
                name: "Hash",
                table: "AuditLogs");
        }
    }
}
