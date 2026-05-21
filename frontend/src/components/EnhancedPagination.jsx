import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  Divider
} from '@mui/material';
import {
  FirstPage,
  LastPage,
  NavigateBefore,
  NavigateNext,
  KeyboardArrowLeft,
  KeyboardArrowRight
} from '@mui/icons-material';

const EnhancedPagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading = false,
  itemLabel = 'contacts'
}) => {
  const [jumpToPage, setJumpToPage] = useState('');

  // Calculate display range
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination for large numbers
      if (currentPage <= 4) {
        // Near start: show 1,2,3,4,5,...,last
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near end: show 1,...,last-4,last-3,last-2,last-1,last
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Middle: show 1,...,current-1,current,current+1,...,last
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpToPage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <Box 
      sx={{ 
        p: 2.5, 
        mt: 0, 
        borderTop: '1px solid #bfc9cf',
        bgcolor: '#FFFFFF',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 3
      }}
    >
      {/* Left side - Info and page size */}
      <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#241C15', fontSize: 13 }}>
            Affichage {startItem}-{endItem} sur {totalItems.toLocaleString()}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography variant="body2" sx={{ color: '#8a9298', fontSize: 13, fontWeight: 500 }}>
            Lignes par page:
          </Typography>
          <Select
            value={pageSize}
            onChange={(e) => onPageSizeChange(e.target.value)}
            size="small"
            sx={{ 
              height: 32, 
              minWidth: 70, 
              fontSize: 13, 
              fontWeight: 700,
              bgcolor: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#bfc9cf' }
            }}
            disabled={loading}
          >
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
            <MenuItem value={200}>200</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Center - Page numbers */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        <IconButton
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || loading}
          size="small"
          sx={{ color: '#241C15', border: '1px solid #bfc9cf', borderRadius: 0, p: 0.5 }}
        >
          <FirstPage fontSize="small" />
        </IconButton>
        
        <IconButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          size="small"
          sx={{ color: '#241C15', border: '1px solid #bfc9cf', borderRadius: 0, p: 0.5, mr: 1 }}
        >
          <KeyboardArrowLeft fontSize="small" />
        </IconButton>

        {pageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <Typography variant="body2" sx={{ px: 1, color: '#8a9298', fontWeight: 700 }}>...</Typography>
            ) : (
              <Button
                variant="text"
                onClick={() => onPageChange(page)}
                disabled={loading}
                sx={{
                  minWidth: 32,
                  height: 32,
                  p: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 0,
                  bgcolor: currentPage === page ? '#241C15' : 'transparent',
                  color: currentPage === page ? '#FFFFFF' : '#241C15',
                  border: '1px solid',
                  borderColor: currentPage === page ? '#241C15' : '#bfc9cf',
                  '&:hover': {
                    bgcolor: currentPage === page ? '#241C15' : '#F5F7F9',
                    borderColor: '#241C15'
                  }
                }}
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}

        <IconButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          size="small"
          sx={{ color: '#241C15', border: '1px solid #bfc9cf', borderRadius: 0, p: 0.5, ml: 1 }}
        >
          <KeyboardArrowRight fontSize="small" />
        </IconButton>

        <IconButton
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || loading}
          size="small"
          sx={{ color: '#241C15', border: '1px solid #bfc9cf', borderRadius: 0, p: 0.5 }}
        >
          <LastPage fontSize="small" />
        </IconButton>
      </Stack>

      {/* Right side - Jump to */}
      <Box display="flex" alignItems="center" gap={1.5}>
        <Typography variant="body2" sx={{ color: '#8a9298', fontSize: 13, fontWeight: 500 }}>
          Aller à:
        </Typography>
        <TextField
          size="small"
          value={jumpToPage}
          onChange={(e) => setJumpToPage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="N°"
          sx={{ 
            width: 50, 
            '& .MuiInputBase-input': { p: '6px 8px', fontSize: 13, fontWeight: 700 },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#bfc9cf' }
          }}
          disabled={loading}
        />
        <Button
          size="small"
          variant="contained"
          onClick={handleJumpToPage}
          disabled={loading || !jumpToPage}
          sx={{ 
            minWidth: 'auto', 
            height: 32, 
            px: 2, 
            bgcolor: '#241C15', 
            borderRadius: 0,
            fontSize: 12,
            fontWeight: 700,
            '&:hover': { bgcolor: '#000000' }
          }}
        >
          OK
        </Button>
      </Box>
    </Box>
  );
};

export default EnhancedPagination;


