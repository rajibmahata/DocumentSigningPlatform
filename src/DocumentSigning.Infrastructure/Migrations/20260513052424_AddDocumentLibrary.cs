using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocumentSigning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentLibrary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LibraryDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MerchantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Purpose = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    FileType = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    EditorContentHtml = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Version = table.Column<int>(type: "int", nullable: false),
                    IsSample = table.Column<bool>(type: "bit", nullable: false),
                    IsTemplateReady = table.Column<bool>(type: "bit", nullable: false),
                    IsWorkflowReady = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LibraryDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LibraryDocuments_Merchants_MerchantId",
                        column: x => x.MerchantId,
                        principalTable: "Merchants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LibraryDocuments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TemplateLibraryDocuments",
                columns: table => new
                {
                    DocumentTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LibraryDocumentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateLibraryDocuments", x => new { x.DocumentTemplateId, x.LibraryDocumentId });
                    table.ForeignKey(
                        name: "FK_TemplateLibraryDocuments_DocumentTemplates_DocumentTemplateId",
                        column: x => x.DocumentTemplateId,
                        principalTable: "DocumentTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TemplateLibraryDocuments_LibraryDocuments_LibraryDocumentId",
                        column: x => x.LibraryDocumentId,
                        principalTable: "LibraryDocuments",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WorkflowLibraryDocuments",
                columns: table => new
                {
                    WorkflowDefinitionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LibraryDocumentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowLibraryDocuments", x => new { x.WorkflowDefinitionId, x.LibraryDocumentId });
                    table.ForeignKey(
                        name: "FK_WorkflowLibraryDocuments_LibraryDocuments_LibraryDocumentId",
                        column: x => x.LibraryDocumentId,
                        principalTable: "LibraryDocuments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WorkflowLibraryDocuments_WorkflowDefinitions_WorkflowDefinitionId",
                        column: x => x.WorkflowDefinitionId,
                        principalTable: "WorkflowDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LibraryDocuments_MerchantId_IsSample",
                table: "LibraryDocuments",
                columns: new[] { "MerchantId", "IsSample" });

            migrationBuilder.CreateIndex(
                name: "IX_LibraryDocuments_MerchantId_Purpose",
                table: "LibraryDocuments",
                columns: new[] { "MerchantId", "Purpose" });

            migrationBuilder.CreateIndex(
                name: "IX_LibraryDocuments_UserId",
                table: "LibraryDocuments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateLibraryDocuments_LibraryDocumentId",
                table: "TemplateLibraryDocuments",
                column: "LibraryDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowLibraryDocuments_LibraryDocumentId",
                table: "WorkflowLibraryDocuments",
                column: "LibraryDocumentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TemplateLibraryDocuments");

            migrationBuilder.DropTable(
                name: "WorkflowLibraryDocuments");

            migrationBuilder.DropTable(
                name: "LibraryDocuments");
        }
    }
}
