using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocumentSigning.Infrastructure.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260417180000_RenameTicketTables")]
    public partial class RenameTicketTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop old FK and indexes on FeedbackMessages before renaming
            migrationBuilder.DropForeignKey(
                name: "FK_FeedbackMessages_FeedbackTickets_TicketId",
                table: "FeedbackMessages");

            migrationBuilder.DropIndex(
                name: "IX_FeedbackTickets_Status",
                table: "FeedbackTickets");

            migrationBuilder.DropIndex(
                name: "IX_FeedbackTickets_UserId",
                table: "FeedbackTickets");

            // Rename tables
            migrationBuilder.RenameTable(
                name: "FeedbackMessages",
                newName: "TicketMessages");

            migrationBuilder.RenameTable(
                name: "FeedbackTickets",
                newName: "Tickets");

            // Re-create indexes on new table names
            migrationBuilder.CreateIndex(
                name: "IX_Tickets_Status",
                table: "Tickets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Tickets_UserId",
                table: "Tickets",
                column: "UserId");

            // Re-add FK with new table name
            migrationBuilder.AddForeignKey(
                name: "FK_TicketMessages_Tickets_TicketId",
                table: "TicketMessages",
                column: "TicketId",
                principalTable: "Tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TicketMessages_Tickets_TicketId",
                table: "TicketMessages");

            migrationBuilder.DropIndex(
                name: "IX_Tickets_Status",
                table: "Tickets");

            migrationBuilder.DropIndex(
                name: "IX_Tickets_UserId",
                table: "Tickets");

            migrationBuilder.RenameTable(
                name: "TicketMessages",
                newName: "FeedbackMessages");

            migrationBuilder.RenameTable(
                name: "Tickets",
                newName: "FeedbackTickets");

            migrationBuilder.CreateIndex(
                name: "IX_FeedbackTickets_Status",
                table: "FeedbackTickets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_FeedbackTickets_UserId",
                table: "FeedbackTickets",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_FeedbackMessages_FeedbackTickets_TicketId",
                table: "FeedbackMessages",
                column: "TicketId",
                principalTable: "FeedbackTickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
