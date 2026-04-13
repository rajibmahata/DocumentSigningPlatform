using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocumentSigning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMerchantSignerEnvelope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DocumentFileName",
                table: "Documents",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DocumentTitle",
                table: "Documents",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "EnvelopeId",
                table: "Documents",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Merchants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ApiKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    RequestLimit = table.Column<int>(type: "int", nullable: false),
                    RequestUsed = table.Column<int>(type: "int", nullable: false),
                    SubscriptionStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SubscriptionEnd = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Merchants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SigningEnvelopes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MerchantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SigningEnvelopes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SigningEnvelopes_Merchants_MerchantId",
                        column: x => x.MerchantId,
                        principalTable: "Merchants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Signers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EnvelopeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Signers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Signers_SigningEnvelopes_EnvelopeId",
                        column: x => x.EnvelopeId,
                        principalTable: "SigningEnvelopes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Documents_EnvelopeId",
                table: "Documents",
                column: "EnvelopeId");

            migrationBuilder.CreateIndex(
                name: "IX_Merchants_ApiKey",
                table: "Merchants",
                column: "ApiKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Signers_EnvelopeId",
                table: "Signers",
                column: "EnvelopeId");

            migrationBuilder.CreateIndex(
                name: "IX_SigningEnvelopes_MerchantId",
                table: "SigningEnvelopes",
                column: "MerchantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_SigningEnvelopes_EnvelopeId",
                table: "Documents",
                column: "EnvelopeId",
                principalTable: "SigningEnvelopes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Documents_SigningEnvelopes_EnvelopeId",
                table: "Documents");

            migrationBuilder.DropTable(
                name: "Signers");

            migrationBuilder.DropTable(
                name: "SigningEnvelopes");

            migrationBuilder.DropTable(
                name: "Merchants");

            migrationBuilder.DropIndex(
                name: "IX_Documents_EnvelopeId",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "DocumentFileName",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "DocumentTitle",
                table: "Documents");

            migrationBuilder.DropColumn(
                name: "EnvelopeId",
                table: "Documents");
        }
    }
}
