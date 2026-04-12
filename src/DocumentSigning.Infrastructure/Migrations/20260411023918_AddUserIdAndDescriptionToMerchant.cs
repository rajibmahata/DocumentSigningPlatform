using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocumentSigning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdAndDescriptionToMerchant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Clear all data that depends on Merchants (dev data — Merchants table
            // is being restructured; existing rows have no UserId).
            migrationBuilder.Sql("DELETE FROM [Claims]");
            migrationBuilder.Sql("DELETE FROM [SignedDocuments]");
            migrationBuilder.Sql("DELETE FROM [SigningRequests]");
            migrationBuilder.Sql("DELETE FROM [Signers]");
            migrationBuilder.Sql("DELETE FROM [Documents]");
            migrationBuilder.Sql("DELETE FROM [AuditLogs]");
            migrationBuilder.Sql("DELETE FROM [OutboxQueue]");
            migrationBuilder.Sql("DELETE FROM [SigningEnvelopes]");
            migrationBuilder.Sql("DELETE FROM [Merchants]");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Merchants",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Merchants",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            // Drop the old Email column that is no longer part of the model
            migrationBuilder.DropColumn(
                name: "Email",
                table: "Merchants");

            migrationBuilder.CreateIndex(
                name: "IX_Merchants_UserId",
                table: "Merchants",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Merchants_Users_UserId",
                table: "Merchants",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Merchants_Users_UserId",
                table: "Merchants");

            migrationBuilder.DropIndex(
                name: "IX_Merchants_UserId",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Merchants");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Merchants");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Merchants",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }
    }
}
