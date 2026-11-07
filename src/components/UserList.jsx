import { useEffect, useState } from "react";
import { UserCard } from "./UserCard";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { UserProfileDialog } from "./UserProfileDialog";

export function UserList({ users, isLoading }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 8;

  // Calculate total pages
  const totalPages = Math.ceil(users.length / usersPerPage);

  // Get current users
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);

  useEffect(() => {
    // If filtering/searching shrinks the result set below the active page,
    // reset to page 1 so cards remain visible.
    if (currentPage !== 1 && (totalPages === 0 || currentPage > totalPages)) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Pagination handlers
  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <>
      {/* Loading Progress Bar */}
      {isLoading && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-sm text-muted-foreground">Searching for matches...</span>
          </div>
          <Progress value={undefined} className="w-full h-2" />
        </div>
      )}

      <div
        data-testid="user-search-results-grid"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
      >
        {currentUsers.map((profile) => (
          <UserCard key={profile?.userid} 
            setSelectedUser={setSelectedUser} 
            profile={profile} 
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="my-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Previous Button */}
          <Button
            onClick={goToPrevious}
            disabled={currentPage === 1}
            variant="outline"
            className="px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary hover:text-primary-foreground transition-all bg-transparent"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            {getPageNumbers().map((page, index) => {
              if (typeof page === 'string') {
                // Render ellipsis
                return (
                  <span
                    key={`${page}-${index}`}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground"
                  >
                    ...
                  </span>
                );
              }
              // Render page number button
              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                    currentPage === page
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-background border border-border hover:bg-muted text-foreground'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <Button
            onClick={goToNext}
            disabled={currentPage === totalPages}
            variant="outline"
            className="px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary hover:text-primary-foreground transition-all bg-transparent"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* User Profile Dialog */}
      {selectedUser && (
        <UserProfileDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
}
